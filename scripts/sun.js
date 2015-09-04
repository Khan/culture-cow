/**
 * Description:
 *   Send prod-deploy commands to jenkins.
 *
 * Configuration:
 *   The JENKINS_DEPLOY_TOKEN environment variables must be set.
 *   The HUBOT_DEBUG flag can be set if you want to debug this
 *   module without risking talking to Jenkins.
 *
 * Commands:
 *   sun, deploy <branch foo> - deploy a particular branch to production
 *   sun, set default - after a deploy succeeds, sets the deploy as default
 *   sun, abort - abort a deploy (at any point during the process)
 *   sun, finish - do the last step in deploy, to merge with master and let the next person deploy
 *   sun, rollback - get a note to use "sun, emergency rollback" instead
 *   sun, emergency rollback - does an emergency rollback outside of deploy process
 *
 * Author:
 *   csilvers
 */

var https       = require('https'),
    Q           = require('q'),
    querystring = require("querystring");


// The room to listen to deployment commands in. For safety reasons,
// culture cow will only listen in this room by default.
const DEPLOYMENT_ROOM = process.env.DEPLOY_ROOM || "hackathon";

// Whether to run in DEBUG mode.  In DEBUG mode, culture cow will not
// actually post commands to Jenkins, nor will it only honor Jenkins
// state commands that come from the actual Jenkins, allowing for
// easier debugging
const DEBUG = !!process.env.HUBOT_DEBUG;


var onHttpError = function(robot, res) {
    var errorMessage = {
        msg: ("(sadpanda) Jenkins won't listen to me.  " +
              "Go talk to it yourself."),
        color: "red",
        room: DEPLOYMENT_ROOM,
        from: "Sun Wukong",
        message_format: "text"
    };
    // The error message usually comes after another hipchat message.
    // Wait a second to encourage hipchat to put the messages in the
    // right order.
    setTimeout(function() { robot.fancyMessage(errorMessage); }, 1000);

    // Also log the error to /var/log/upstart/culture-cow.*.  (Recipe from
    // http://nodejs.org/api/http.html#http_http_request_options_callback).
    console.error('ERROR TALKING TO JENKINS:');
    if (res.statusCode) {
        console.error('   Status: ' + res.statusCode);
        console.error('   Headers: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.error('   Body: ' + chunk);
        });
    } else {
        console.error(res);
    }
};

var wrongRoom = function(robot, msg) {
    robot.fancyMessage({
        msg: "How dare you approach me outside my temple?!",
        color: "red",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};

/**
 * Return whether the proposed step is valid.
 */
var pipelineStepIsValid = function(robot, deployState, step) {
    return (deployState.POSSIBLE_NEXT_STEPS &&
            deployState.POSSIBLE_NEXT_STEPS.indexOf(step) !== -1);
};

var wrongPipelineStep = function(robot, msg, badStep) {
    robot.fancyMessage({
        // TODO(csilvers): list the steps we are expecting, here.
        msg: ("I'm not going to " + badStep + " -- it's not time for that. " +
              "If you disagree, bring it up with Jenkins."),
        color: "red",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};


/**
 * Get a promise for a URL or node http options object.
 */
var _httpsGet = function(url) {
  var deferred = Q.defer();
  var req = https.get(url, deferred.resolve);
  req.on('error', deferred.reject);
  return deferred.promise;
};


/**
 * Get the current state of the deploy from Jenkins.
 *
 * Returns a promise for the state.
 */
var _getDeployState = function() {
    return _httpsGet("https://jenkins.khanacademy.org/deploy-state.json");
};


/**
 * Returns a promise for the current job ID if one is running, or false if not.
 */
var _jenkinsJobStatus = function(jobName) {
    return _httpsGet({
        hostname: 'jenkins.khanacademy.org',
        port: 443,
        path: '/job/' + jobName + '/lastBuild/api/json',
        auth: 'jenkins@khanacademy.org:' + process.env.JENKINS_API_TOKEN
    }).then(function (res) {
        var deferred = Q.defer();
        if (res.statusCode > 299) {
            deferred.reject(res);
        } else {
            var data = '';
            res.on('data', function(chunk) {data += chunk;});
            res.on('end', function() {
                data = JSON.parse(data);
                if (data.building === undefined) {
                    deferred.reject(res);
                } else if (data.building && !data.number) {
                    deferred.reject(res);
                } else if (data.building) {
                    deferred.resolve(data.number);
                } else {
                    deferred.resolve(false);
                }
            });
        }
        return deferred.promise;
    });
};


/**
 * Get the current running jobs from Jenkins.
 *
 * We check the three jobs deploy-via-multijob, deploy-set-default, and
 * deploy-finish.
 *
 * Returns a promise for an object with two keys, jobName (string) and jobId
 * (number), for the currently running job, or null if there is no job running.
 *
 * If, somehow, multiple such jobs are running, return the first one.  This
 * shouldn't happen.
 */
var _getRunningJob = function() {
    var jobs = ['deploy-via-multijob', 'deploy-set-default', 'deploy-finish'];
    var result = Q.all(jobs.map(_jenkinsJobStatus))
    .then(function (jobIds) {
        var retval = null;
        jobs.forEach(function (name, index) {
            if (jobIds[index]) {
                retval = {
                    jobName: name,
                    jobId: jobIds[index],
                };
            }
        });
        return retval;
    });
    return result;
};



// postData is an object, which we will encode and post to either
// /job/<job>/build or /job/<job>/buildWithParameters, as appropriate.
var runJobOnJenkins = function(robot, msg, jobName, postData, hipchatMessage) {
    var path;
    if (Object.keys(postData).length === 0) {  // no parameters
        path = '/job/' + jobName + '/build';
    } else {
        path = '/job/' + jobName + '/buildWithParameters';
    }
    
    runOnJenkins(robot, msg, path, postData, hipchatMessage);
};


var cancelJobOnJenkins = function(robot, msg, jobName, jobId, hipchatMessage) {
    var path = '/job/' + jobName + '/' + jobId + '/stop';
    runOnJenkins(robot, msg, path, {}, hipchatMessage, true);
};


// path should be the URL path; postData should be an object which we will
// encode.  If allowRedirect is falsy, we will consider a 3xx response an
// error.  If allowRedirect is truthy, we will consider a 3xx response a
// success.  (This is because a 302, for instance, might mean that we need to
// follow a redirect to do the thing we want, or it might mean that we were
// successful and are now getting redirected to a new page.)
var runOnJenkins = function(robot, msg, path, postData, hipchatMessage,
                            allowRedirect) {
    var options = {
        hostname: 'jenkins.khanacademy.org',
        port: 443,
        method: 'POST',
        path: path,
        auth: 'jenkins@khanacademy.org:' + process.env.JENKINS_API_TOKEN
    };

    postData = querystring.stringify(postData);

    // Tell hipchat readers what we're doing.
    robot.fancyMessage({
        msg: (DEBUG ? "DEBUG :: " : "") + hipchatMessage,
        color: "purple",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });

    if (DEBUG) {
        console.log(options);
        return;
    }

    var req = https.request(options, function(res) {
        // Jenkins apparently now sometimes returns 201s for success, so allow
        // that.  We don't want to allow 3xx because that means that whatever
        // we were trying to do wasn't done.
        if ((!allowRedirect && res.statusCode > 299) || res.statusCode > 399) {
            onHttpError(robot, res);
        }
    });

    // write data to request body
    req.setHeader('Content-length', postData.length);
    req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.write(postData);
    req.end();
};


var handlePing = function(robot, deployState, msg) {
    robot.fancyMessage({
        msg: "I AM THE MONKEY KING!",
        color: "purple",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};

var handleState = function(robot, deployState, msg) {
    var prettyState = JSON.stringify(deployState, null, 2);
    _getRunningJob().then(function(job) {
        var prettyRunningJob = JSON.stringify(job, null, 2);
        robot.fancyMessage({
            msg: ("Here's the state of the deploy: ```\n" +
                  prettyRunningJob + "\n\n" + prettyState + "\n```"),
            color: "purple",
            room: msg.envelope.room,
            from: "Sun Wukong",
        });
    })
    .catch(function(err) {
        // If anywhere along the line we got an error, say so.
        onHttpError(robot, err);
    });
};

var handleDeploy = function(robot, deployState, msg) {
    if (deployState.POSSIBLE_NEXT_STEPS) {
        robot.fancyMessage({
            msg: ("I think there's a deploy already going on.  If that's " +
                  "not the case, or you want to start a deploy anyway, say " +
                  "'sun, deploy " + msg.match[1] + ", dagnabit'."),
            color: "red",
            room: msg.envelope.room,
            from: "Sun Wukong",
        });
        return;
    }

    var deployBranch = msg.match[1];
    var caller = msg.envelope.user.mention_name;
    var postData = {
        "GIT_REVISION": deployBranch,
        // In theory this should be an email address but we actually
        // only care about hipchat names for the script, so we make up
        // a 'fake' email that yields our hipchat name.
        "BUILD_USER_ID_FROM_SCRIPT": caller + "@khanacademy.org",
    };

    runJobOnJenkins(robot, msg, 'deploy-via-multijob', postData,
                 "Telling Jenkins to deploy branch " + deployBranch + ".");
};

var handleSetDefault = function(robot, deployState, msg) {
    if (!pipelineStepIsValid(robot, deployState, 'set-default')) {
        wrongPipelineStep(robot, msg, 'set-default');
        return;
    }
    var postData = {
        'TOKEN': deployState.TOKEN
    };
    runJobOnJenkins(robot, msg, 'deploy-set-default', postData,
                 "Telling Jenkins to set default.");
};

var handleAbort = function(robot, deployState, msg) {
    _getRunningJob().then(function(runningJob) {
        if (runningJob) {
            // There's a job running, so we should probably cancel it.
            if (runningJob.jobName === 'deploy-finish') {
                // We shouldn't cancel a deploy-finish.  If we need to roll
                // back, we now need to do an emergency rollback; otherwise we
                // should just let it finish and then do our thing.
                robot.fancyMessage({
                    msg: ("I think there's currently a deploy-finish job " +
                          "running.  If you need to roll back, you will " +
                          "need to do an emergency rollback ('sun, " +
                          "emergency rollback').  If not, just let it " +
                          "finish, or check what it's doing yourself: " +
                          "https://jenkins.khanacademy.org/job/" +
                          "deploy-finish/" + runningJob.jobId),
                    color: "red",
                    room: msg.envelope.room,
                    from: "Sun Wukong",
                });
            } else {
                // Otherwise, cancel the job.
                cancelJobOnJenkins(robot, msg, runningJob.jobName,
                                   runningJob.jobId, "Telling Jenkins to " +
                                   "cancel " + runningJob.jobName +
                                   " #" + runningJob.jobId + ".");
            }
        } else if (!deployState.POSSIBLE_NEXT_STEPS) {
            // If no deploy is in progress, we had better not abort.
            msg.reply("I don't think there's a deploy going.  If you need " +
                      "to roll back the production servers because you " +
                      "noticed some problems after a deploy finished, say " +
                      "'sun, emergency rollback'.  If you think there's a " +
                      "deploy going, then I'm confused and you'll have to " +
                      "talk to Jenkins yourself.");
        } else {
            // Otherwise, we're between jobs in a deploy, and we should
            // determine from the deploy state what to do.
            var postData = {
                'TOKEN': deployState.TOKEN,
                'WHY': 'aborted'
            };
            var response;
            if (pipelineStepIsValid(robot, deployState, 'set-default')) {
                // If no build is running, and we could set default, we can just as
                // easily just give up
                postData.STATUS = 'failure';
                response = 'abort';
            } else {
                // Otherwise, we'd better roll back.
                postData.STATUS = 'rollback';
                postData.ROLLBACK_TO = deployState.ROLLBACK_TO;
                response = 'abort and roll back';
            }
            runJobOnJenkins(robot, msg, 'deploy-finish', postData,
                         "Telling Jenkins to " + response + " this deploy.");
        }
    })
    .catch(function(err) {
        // If anywhere along the line we got an error, say so.
        onHttpError(robot, err);
    });
};

var handleFinish = function(robot, deployState, msg) {
    if (!pipelineStepIsValid(robot, deployState, 'finish-with-success')) {
        wrongPipelineStep(robot, msg, 'finish-with-success');
        return;
    }
    var postData = {
        'TOKEN': deployState.TOKEN,
        'STATUS': 'success'
    };
    runJobOnJenkins(robot, msg, 'deploy-finish', postData,
                 "Telling Jenkins to finish this deploy!");
};

var handleRollback = function(robot, deployState, msg) {
    robot.fancyMessage({
        msg: ("Are you currently doing a deploy?  Say <b>sun, abort</b> " +
              "instead.  Do you want to roll back the production servers " +
              "because you noticed some problems with them after their " +
              "deploy was finished?  Say <b>sun, emergency rollback</b>."),
        color: "red",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};

var handleEmergencyRollback = function(robot, deployState, msg) {
    var jobname = '---EMERGENCY-ROLLBACK---';
    runJobOnJenkins(robot, msg, jobname, {},
                 "Telling Jenkins to roll back the live site to a safe " +
                 "version");
};


// fn takes a robot object, the deploy state, and a hubot message object.
var hearInDeployRoom = function(robot, regexp, fn) {
    robot.hear(regexp, function(msg) {
        if (!DEBUG && msg.envelope.room !== DEPLOYMENT_ROOM) {
            wrongRoom(robot, msg);
            return;
        }

        _getDeployState()
        .then(function(res) {
            var deferred = Q.defer();
            if (res.statusCode === 404) {
                deferred.resolve({});
            } else if (res.statusCode > 299) {
                deferred.reject(res);
            } else {
                var data = '';
                res.on('data', function(chunk) {data += chunk;});
                res.on('end', function() {
                    deferred.resolve(JSON.parse(data));});
            }
            return deferred.promise;
        })
        .then(function(state) {
            fn(robot, state, msg);
        })
        .catch(function(err) {
            onHttpError(robot, err);
        });
    });
};

module.exports = function(robot) {
    hearInDeployRoom(robot, /^sun,\s+ping$/i, handlePing);
    hearInDeployRoom(robot, /^sun,\s+state$/i, handleState);

    // These are the user-typed commands we listen for.
    hearInDeployRoom(robot, /^sun,\s+deploy\s+(?:branch\s+)?([^,]*)(, dagnabit)?$/i, handleDeploy);
    hearInDeployRoom(robot, /^sun,\s+set.default$/i, handleSetDefault);
    hearInDeployRoom(robot, /^sun,\s+abort.*$/i, handleAbort);
    hearInDeployRoom(robot, /^sun,\s+finish.*$/i, handleFinish);
    // Does an emergency rollback, outside the deploy process
    hearInDeployRoom(robot, /^sun,\s+rollback.*$/i, handleRollback);
    hearInDeployRoom(robot, /^sun,\s+emergency rollback.*$/i,
                     handleEmergencyRollback);
};

// The hubot for Sun Wukong, the monkey king.
//
// Sun is responsible for listening to deploy commands:
//    sun, deploy branch foo
//    sun, set default
// etc.

var http = require('http'),
    querystring = require("querystring");


// This is a list of currently allowed deploy commands and the
// post-data to send to jenkins to have it do that command.  (The
// exception is 'deploy', where the post-data is determined from the
// hubot message itself.)  (NOTE: for 'cancel' this holds a GET url,
// not POST data.)  The list of allowed deploy commands changes as we
// make our way through the deploy pipeline.
var gNextPipelineCommands = {
    // When we start out, the only pipeline step to do is the first one.
    deploy: true,
    setDefault: null,
    abort: null,       // used to cancel *in between* individual hipchat jobs
    cancel: null,      // used to cancel a running hipchat job
    finish: null,
};

// Resets gNextPipelineCommands to indicate what commands are now
// acceptable (based on the current state of the pipeline).
var setNextPipelineCommands = function(newData) {
    gNextPipelineCommands = {
        deploy: newData.deploy || false,
        setDefault: newData.setDefault || null,
        abort: newData.abort || null,
        cancel: newData.cancel || null,
        finish: newData.finish || null
    };
};


var onHttpError = function(res) {
    var errorMessage = {
        msg: ("(sadpanda) Jenkins won't listen to me.  " +
              "Go talk to it yourself."),
        color: "red",
        room: "1s0s_deploys",
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
    console.error('   Status: ' + res.statusCode);
    console.error('   Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.error('   Body: ' + chunk);
    });
};

var wrongRoom = function(robot, msg) {
    robot.fancyMessage({
        msg: "How dare you approach me outside my temple?!",
        color: "red",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
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


// postData is a url-encoded string, suitable for sending in the http body.
var runOnJenkins = function(robot, msg, postData, hipchatMessage) {
    var options = {
        hostname: 'jenkins.khanacademy.org',
        port: 80,
        path: '/buildByToken/buildWithParameters',
        method: 'POST'
    };

    // Add some invariants to the post data.  (JENKINS_DEPLOY_TOKEN is
    // under our control and we know it's url-escape safe.)
    postData = postData + ("&token=" + process.env.JENKINS_DEPLOY_TOKEN +
                           "&cause=Sun+Wukong");

    // Tell hipchat readers what we're doing.
    robot.fancyMessage({
        msg: hipchatMessage,
        color: "purple",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });

    var req = http.request(options, function(res) {
        if (res.statusCode !== 200) { onHttpError(res); }
    });

    // write data to request body
    req.setHeader('Content-length', postData.length);
    req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.write(postData);
    req.end();
};


var handlePing = function(robot, msg) {
    robot.fancyMessage({
        msg: "I AM THE MONKEY KING!",
        color: "purple",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};

var handleDeploy = function(robot, msg) {
    if (!gNextPipelineCommands.deploy && !msg.match[2]) {
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
    var postDataMap = {
        "job": "deploy-via-multijob",
        "GIT_REVISION": deployBranch,
        // In theory this should be an email address but we actually
        // only care about hipchat names for the script, so we make up
        // a 'fake' email that yields our hipchat name.
        "BUILD_USER_ID_FROM_SCRIPT": caller + "@khanacademy.org",
    };
    var postData = querystring.stringify(postDataMap);

    runOnJenkins(robot, msg, postData,
                 "Telling Jenkins to deploy branch " + deployBranch + ".");
};

var handleSetDefault = function(robot, msg) {
    if (!gNextPipelineCommands.setDefault) {
        wrongPipelineStep(robot, msg, 'set-default');
        return;
    }
    runOnJenkins(robot, msg, gNextPipelineCommands.setDefault,
                 "Telling Jenkins to set default.");
};

var handleAbort = function(robot, msg) {
    if (gNextPipelineCommands.cancel) {
        // Jenkins has two different ways to abort: cancel (if we're
        // in the middle of running a job) or abort (if we're between
        // jobs).  Cancel uses a GET, not a POST, so we can't use
        // runOnJenkins().
        robot.fancyMessage({
            msg: "Telling Jenkins to cancel this deploy.",
            color: "purple",
            room: msg.envelope.room,
            from: "Sun Wukong",
        });
        http.get({host: "jenkins.khanacademy.org",
                  path: gNextPipelineCommands.cancel},
                 function(res) { onHttpError(res); });
        return;
    }

    if (!gNextPipelineCommands.abort) {
        wrongPipelineStep(robot, msg, 'abort');
        return;
    }
    runOnJenkins(robot, msg, gNextPipelineCommands.abort,
                 "Telling Jenkins to abort this deploy.");
};

var handleFinish = function(robot, msg) {
    if (!gNextPipelineCommands.abort) {
        wrongPipelineStep(robot, msg, 'finish');
        return;
    }
    runOnJenkins(robot, msg, gNextPipelineCommands.finish,
                 "Telling Jenkins to finish this deploy!");
};

var handleRollback = function(robot, msg) {
    robot.fancyMessage({
        msg: ("If you want to roll back the production servers because " +
              "you noticed some problems with them after their deploy " +
              "was finished, say <b>sun, emergency rollback</b>."),
        color: "red",
        room: msg.envelope.room,
        from: "Sun Wukong",
    });
};

var handleEmergencyRollback = function(robot, msg) {
    var jobname = '++ EMERGENCY ROLLBACK ++';
    runOnJenkins(robot, msg, 'job=' + querystring.escape(jobname),
                 "Telling Jenkins to roll back the live site to a safe " +
                 "version");
};


var _appendJobname = function(jobname, otherPostParams) {
    return otherPostParams + '&job=' + querystring.escape(jobname);
};

var handleAfterDeploy = function(robot, msg) {
    setNextPipelineCommands(
        {"setDefault": _appendJobname(msg.match[1], msg.match[2]),
         "abort": _appendJobname(msg.match[3], msg.match[4])
        });
};

var handleAfterSetDefault = function(robot, msg) {
    setNextPipelineCommands({"cancel": msg.match[1]});
};

var handleAfterMonitoring = function(robot, msg) {
    setNextPipelineCommands(
        {"finish": _appendJobname(msg.match[1], msg.match[2]),
         "abort": _appendJobname(msg.match[3], msg.match[4])
        });
};

var handleDeployDone = function(robot, msg) {
    // The old deploy is over, time to start a new one!
   setNextPipelineCommands({"deploy": true});
};


// fn takes a robot object and a hubot message object.
var hearInDeployRoom = function(robot, regexp, fn) {
    robot.hear(regexp, function(msg) {
        if (msg.envelope.room !== "1s0s_deploys") {
            wrongRoom(robot, msg);
            return;
        }
        fn(robot, msg);
    });
};


module.exports = function(robot) {
    hearInDeployRoom(robot, /^sun,\s+ping$/i, handlePing);

    // These are the user-typed commands we listen for.
    hearInDeployRoom(robot, /^sun,\s+deploy\s+(?:branch\s+)?([^,]*)(, dagnabit)?$/i, handleDeploy);
    hearInDeployRoom(robot, /^sun,\s+set.default$/i, handleSetDefault);
    hearInDeployRoom(robot, /^sun,\s+abort.*$/i, handleAbort);
    hearInDeployRoom(robot, /^sun,\s+finish.*$/i, handleFinish);
    // Does an emergency rollback, outside the deploy process
    hearInDeployRoom(robot, /^sun,\s+rollback.*$/i,
                     handleRollback);
    hearInDeployRoom(robot, /^sun,\s+emergency rollback.*$/i,
                     handleEmergencyRollback);

    // These are the Jenkins-emitted hipchat messages we listen for.
    hearInDeployRoom(robot, /\(successful\) set it as default: http:\/\/jenkins.khanacademy.org\/job\/([^\/]*)\/parambuild\?([^\n]*)\n\(failed\) abort the deploy: http:\/\/jenkins.khanacademy.org\/job\/([^\/]*)\/parambuild\?(.*)/, handleAfterDeploy);
    hearInDeployRoom(robot, /\(failed\) abort and rollback: http:\/\/jenkins.khanacademy.org(.*\/stop)$/, handleAfterSetDefault);
    hearInDeployRoom(robot, /\(successful\) finish up: http:\/\/jenkins.khanacademy.org\/job\/([^\/]*)\/parambuild\?([^\n]*)\n\(failed\) abort and roll back: http:\/\/jenkins.khanacademy.org\/job\/([^\/]*)\/parambuild\?(.*)/, handleAfterMonitoring);
    hearInDeployRoom(robot, /Deploy of .* (failed[:.]|succeeded!)/, handleDeployDone);
};

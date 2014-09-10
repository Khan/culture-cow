// The hubot for Sun Wukong, the monkey king.
// Sun is responsible for listening to deploy commands:
//    sun, deploy branch foo
// etc.

var http = require('http');


var runDeployOnJenkins = function(robot, deployBranch, caller) {
    var postData = ("job=deploy-via-multijob" +
                    "&token=" + process.env.JENKINS_DEPLOY_TOKEN +
                    "&GIT_REVISION=" + deployBranch +
                    // In theory this should be an email address but
                    // we actually only care about hipchat names for
                    // the script, so we make up a 'fake' email that
                    // yields our hipchat name.
                    "&BUILD_USER_ID_FROM_SCRIPT=" +
                    caller + "@khanacademy.org" +
                    "&cause=Sun+Wukong\n");

    var options = {
        hostname: 'jenkins.khanacademy.org',
        port: 80,
        path: '/buildByToken/buildWithParameters',
        method: 'POST'
    };

    var errorMessage = {
        msg: ("(sadpanda) Jenkins won't listen to me.  " +
              "Go talk to it yourself."),
        color: "red",
        room: "1s0s_deploys",
        from: "Sun Wukong",
    };

    var req = http.request(options, function(res) {
        if (res.statusCode !== 200) {
            // Wait a second to encourage hipchat to put the messages
            // in the right order.
            setTimeout(function() { robot.fancyMessage(errorMessage); }, 1000);
        }
    });

    req.on('error', function(e) {
        setTimeout(function() { robot.fancyMessage(errorMessage); }, 1000);
    });

    // write data to request body
    req.setHeader('Content-length', postData.length);
    req.write(postData);
    req.end();
};


module.exports = function(robot) {
  robot.hear(/^sun,\s+deploy\s+(?:branch\s+)?(.*)$/i, function(msg) {
      var text;
      var deployBranch = null;
      if (msg.envelope.room === '1s0s_deploys') {
          deployBranch = msg.match[1];
          text = "Telling Jenkins to deploy branch " + deployBranch;
      } else {
          text = "How dare you approach me outside my temple?!";
      }
      var hipchatMessage = {
          msg: text,
          color: "purple",
          room: msg.envelope.room,
          from: "Sun Wukong",
      };
      robot.fancyMessage(hipchatMessage);

      if (deployBranch) {
          runDeployOnJenkins(robot, deployBranch,
                             msg.envelope.user.mention_name);
      }
  });

  robot.hear(/^sun,\s+ping$/i, function(msg) {
      if (msg.envelope.room === '1s0s_deploys') {
          text = "I AM THE MONKEY KING!";
      } else {
          text = "How dare you approach me outside my temple?!";
      }
      var hipchatMessage = {
          msg: text,
          color: "purple",
          room: msg.envelope.room,
          from: "Sun Wukong",
      };
      robot.fancyMessage(hipchatMessage);
  });
};

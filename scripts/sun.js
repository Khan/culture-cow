// The hubot for Sun Wukong, the monkey king.
// Sun is responsible for listening to deploy commands:
//    sun, deploy branch foo
// etc.

var http = require('http');


var runDeployOnJenkins = function(robot, deployBranch, caller) {
    var options = {
        hostname: 'jenkins.khanacademy.org',
        port: 80,
        path: '/buildByToken/buildWithParameters',
        method: 'POST'
    };

    var req = http.request(options, function(res) {});

    req.on('error', function(e) {
        var hipchatMessage = {
            msg: ("(sadpanda) Jenkins won't listen to me.  " +
                  "Go talk to it yourself."),
            color: "red",
            room: "1s/0s: deploys",
            from: "Sun Wukong",
        };
        robot.fancyMessage(hipchatMessage);
    });

    // write data to request body
    req.write("job=deploy-via-multijob" +
              "&token=" + process.env.JENKINS_DEPLOY_TOKEN +
              "&GIT_REVISION=" + deployBranch +
              // In theory this should be an email address but we
              // actually only care about hipchat names for the
              // script, so we make up a 'fake' email that yields our
              // hipchat name.
              "&BUILD_USER_ID_FROM_SCRIPT=" + caller + "@khanacademy.org" +
              "&cause=Sun+Wukong\n");
    req.end();
};


module.exports = function(robot) {
  robot.hear(/^sun,\s+deploy\s+(?:branch\s+)?(.*)$/i, function(msg) {
      var text;
      var deployBranch = null;
      if (msg.envelope.room === '1s0s_deploys') {
          deployBranch = msg.match[1];
          text = "Telling hipchat to deploy branch " + deployBranch;
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
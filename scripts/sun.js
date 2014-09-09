// The hubot for Sun Wukong, the monkey king.
// Sun is responsible for listening to deploy commands:
//    sun, deploy branch foo
// etc.

var http = require('http');


var runDeployOnJenkins = function(robot, deployBranch) {
    var options = {
        hostname: 'jenkins.khanacademy.org',
        port: 80,
        path: '/job/deploy-via-multijob/buildWithParameters',
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
    req.write("token=SUN_SEZ_DEPLOY&GIT_REVISION=" + deployBranch + "\n");
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
          runDeployOnJenkins(deployBranch);
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

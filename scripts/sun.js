// The hubot for Sun Wukong, the monkey king.
// Sun is responsible for listening to deploy commands:
//    sun, deploy branch foo
// etc.

module.exports = function(robot) {
  robot.hear(/^sun,\s+deploy\s+(?:branch\s+)?(.*)$/i, function(msg) {
      var text;
      if (msg.envelope.room === '1s0s_deploys') {
          text = "Telling hipchat to deploy branch " + msg.match[1];
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

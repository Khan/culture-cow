var Trello = require("node-trello");
var url = require("url");

var t = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

var outputCardData = function(err, data) {
  // ZOMG HOW GROSS IS THIS!?!?!?!?!?!?
  var output = "<table>"
  output += "<tr><td>&nbsp;</td><td><strong>" +
    '<a href="' + data['url'] + '">' + data['name'] + "</a></strong></td></tr>";

  if (data['desc']) {
    output += '<tr><td>&nbsp;</td><td>' + data['desc'] +'</td>';
  }

  if (data['members'].length) {
    var icns = data['members'].map(function(c, i, a) {
      return '<img src="' +
        "https://trello-avatars.s3.amazonaws.com/"+ c['avatarHash'] +"/30.png" +
        '" width="30" height="30" />';
    })
    output += '<tr><td>&nbsp;</td><td>' + icns.join("") + '</td></tr>';
  } else {
    output += '<tr><td>&nbsp;</td><td><i>nobody here yet</i></td></tr>';
  }


  if (data["due"]) {
    var dueDate = ((new Date(data["due"]))+"").split(" ");
    var readable = dueDate.slice(0, 3);
    output += '<tr><td align="right"><strong>Due:</strong></td><td>' + readable + '</td></tr>';
  }

  output += '</table>';
  return output
}

var queryTrello = function(cardId, cow, msg) {
  t.get("/1/cards/" + cardId,
    {
      member_fields: "all",
      members: true,
    },

    function(err, data){
      var message = {
        msg: outputCardData(err, data),
        color: "gray",
        room: msg.envelope.room,
        from: "Trello Troll"
      };
      cow.fancyMessage(message);
    }
  );
}

module.exports = function(robot) {
  robot.hear(/https?:\/\/trello.com\/c\/([\w\d]+)/ig, function(msg) {

    if (msg.message.user.jid) {
      // only humans have user.jid set, otherwise this message will cause
      // the cow to hear it again and again and again and reply each time
      // causing an endless trello spam loop
      msg.match.map(function(e) {
        cardId = e.split(".com/c/")[1]
        queryTrello(cardId, robot, msg);
      });
    }
  })
}

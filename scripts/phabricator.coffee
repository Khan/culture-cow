# Description:
#   Shows a link to phabricator tasks and issues mentioned in comments
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   D#### - show a link to phabricator review
#   T#### - show a link to phabricator task
#
# Author:
#   tzjames

module.exports = (robot) ->
  robot.hear /\b((D|T)\d+)\b/i, (msg) ->
    if robot.fromSelf msg
        return
    robot.fancyMessage({
        msg: "http://phabricator.khanacademy.org/" + msg.match[1],
        room: msg.envelope.room,
        from: "Phabot Rabbit",
        message_format: "text"
    });


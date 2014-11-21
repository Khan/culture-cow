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
  # We check for whitespace rather than a word boundary beforehand to make sure 
  # we don't match links, as / is considered a word boundary.
  robot.hear /(^|\s)((D|T)\d+)\b/i, (msg) ->
    if robot.fromSelf msg
        return
    robot.fancyMessage({
        msg: "https://phabricator.khanacademy.org/" + msg.match[2],
        room: msg.envelope.room,
        from: "Phabot Rabbit",
        message_format: "text"
    });


# Description:
#   A cow's gonna be a cow.
#
# Commands:
#   moo* - Reply w/ moo

module.exports = (robot) ->
  robot.hear /\bmo{2,}\b/i, (msg) ->
    if robot.fromSelf msg
        return
    if msg.envelope.room == "1s_and_0s"
      robot.messageHipchat "MOOOOOOOOOOOOOOOOO"
    else
      if !msg.envelope.room
        msg.send "This incident will be reported"

  robot.hear /\bdesmondo{1,}\b/i, (msg) ->
    if robot.fromSelf msg
        return
    if msg.envelope.room == "1s_and_0s"
      robot.messageHipchat "desmondOOOOOOOooooooo"
    else
      if !msg.envelope.room
        msg.send "This incident will be reported"

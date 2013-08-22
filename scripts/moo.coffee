# Description:
#   A cow's gonna be a cow.
#
# Commands:
#   hubot moo* - Reply w/ moo

module.exports = (robot) ->
  robot.hear /\bmo{2,}\b/i, (msg) ->
    if msg.envelope.room == "1s_and_0s"
      robot.messageHipchat "MOOOOOOOOOOOOOOOOO"
    else
      if !msg.envelope.room
        msg.send "This attempt has been logged"


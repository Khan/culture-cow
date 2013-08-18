# Description:
#   A cow's gonna be a cow.
#
# Commands:
#   hubot moo* - Reply w/ moo

module.exports = (robot) ->
  robot.hear /\bmo{2,}\b/i, (msg) ->
    robot.messageHipchat "MOOOOOOOOOOOOOOOOO"


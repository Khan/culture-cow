# Description:
#   A cow's gonna be a cow.
#
# Commands:
#   hubot moo* - Reply w/ moo

module.exports = (robot) ->
  robot.hear /(\s|^)mo{2,100}(\s|$)/i, (msg) ->
    robot.messageHipchat "MOOOOOOOOOOOOOOOOO"


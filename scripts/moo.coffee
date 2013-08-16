# Description:
#   A cow's gonna be a cow.
#
# Commands:
#   hubot moo* - Reply w/ moo

module.exports = (robot) ->
  robot.hear /(\s|^)(m|n)o{2,100}(\s|$)/i, (msg) ->
    msg.send "MOOOOOOOOOOOOOOOOO"


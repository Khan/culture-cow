# Description:
#   A hubot interface for Bang, a key-value store for text snippets
#
# Dependencies:
#   "bang": "1.0.1"
#   "shellwords": "0.0.1"
#
# Configuration:
#   None
#
# Commands:
#   bang [--help|--list|--delete] <key> [value] - Store and retrieve text snippets
#
# Author:
#   jimmycuadra

Bang  = require "bang"
{split} = require "shellwords"

module.exports = (robot) ->
  robot.hear /^bang\s+(.*)/i, (msg) ->
    if robot.fromSelf msg
        return
    try
      args = split(msg.match[1])
    catch error
      text = "I couldn't Bang that cause your quotes didn't match."
      robot.fancyMessage({
            msg: text,
            room: msg.envelope.room,
            from: "Bang Baboon",
      });

    bang = new Bang
    bang.data = robot.brain.data.bang ?= {}
    bang.save = -> robot.brain.save()

    [key, value] = args

    if key in ["-h", "--help"]
      text =    """
                Bang stores text snippets in my brain.
                Set a key:    bang foo bar
                Get a key:    bang foo
                Delete a key: bang [-d|--delete] foo
                List keys:    bang [-l|--list]
                Get help:     bang [-h|--help]
                """
    else if key in ["-l", "--list"]
      list = bang.list()
      if list
        text = list
      else
        text = "I couldn't find any Bang data in my brain."
    else if key in ["-d", "--delete"] and value
      bang.delete value
      text = "I stopped Banging #{value}."
    else if key and value
      bang.set key, value
      text = "I Banged #{value} into #{key}."
    else if key
      result = bang.get key
      if result
        text = result
      else
        text = "Nothing's been Banged into #{key}."

    robot.fancyMessage({
            msg: text,
            room: msg.envelope.room,
            from: "Bang Baboon",
            message_format: "text"
    });

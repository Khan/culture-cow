# Description
#   A Hubot script to persist hubot's brain using text-file
#
# Commands:
#   None
#
# Author:
#   sam

fs = require 'fs'

module.exports = (robot) ->
  brainFile = '/home/ubuntu/culture-cow/brain-dump.json'

  robot.brain.setAutoSave false

  load = ->
    try
      data = JSON.parse fs.readFileSync brainFile, encoding: 'utf-8'
      robot.brain.mergeData data
      robot.brain.setAutoSave true
    catch error
      console.error 'Error in reading brain file. Check that ' + brainFile +
                    ' exists and is valid JSON.'

  save = (data) ->
    fs.writeFileSync brainFile, JSON.stringify(data), 'utf-8'

  robot.brain.on 'save', save

  load()

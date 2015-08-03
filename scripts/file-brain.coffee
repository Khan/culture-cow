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
  HOME_PATH = '/home/ubuntu/culture-cow/brain-dump.json'
  try
    # throws an error if the file doesn't exist; we don't care about the result
    _ = fs.lstat(HOME_PATH)
    brainFile = HOME_PATH
  catch error
    brainFile = __dirname + '/../brain-dump.json'

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

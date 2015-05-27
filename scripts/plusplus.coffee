# Description:
#   Give or take away points. Keeps track and even prints out graphs.
#
# Dependencies:
#   "underscore": ">= 1.0.0"
#   "clark": "0.0.6"
#
# Configuration:
#
# Commands:
#   <name>++
#   <name>--
#   hubot score <name>
#   hubot top <amount>
#   hubot bottom <amount>
#   hubot scoreboard
#
# Author:
#   ajacksified

_ = require("underscore")
clark = require("clark").clark

class ScoreKeeper
  constructor: (@robot) ->
    @cache =
      scoreLog: {}
      scores: {}

    @robot.brain.on 'loaded', =>
      @robot.brain.data.scores ||= {}
      @robot.brain.data.scoreLog ||= {}

      @cache.scores = @robot.brain.data.scores
      @cache.scoreLog = @robot.brain.data.scoreLog

  getUser: (user) ->
    @cache.scores[user] ||= 0
    user

  saveUser: (user, from) ->
    @saveScoreLog(user, from)
    @robot.brain.data.scores[user] = @cache.scores[user]
    @robot.brain.data.scoreLog[from] = @cache.scoreLog[from]
    @robot.brain.emit('save', @robot.brain.data)
    @cache.scores[user]

  findUserByMentionName: (mentionName) ->
    mentionName = mentionName.replace(/@/g, "")
    for user_jid, user of @robot.brain.data.users
      if user.mention_name == mentionName
        return user.name
    return mentionName

  findMentionNameByUser: (user_name) ->
    for user_jid, user of @robot.brain.data.users
      if user.name == user_name
        return user.mention_name
    return "Could not find: #{user_name}."

  setMentionName: (user_name, mention_name) ->
    user = @robot.brain.userForName(user_name)
    @robot.brain.data.users[user.id].mention_name = mention_name

  add: (user, from) ->
    if @validate(user, from)
      user = @getUser(user)
      @cache.scores[user]++
      @saveUser(user, from)

  subtract: (user, from) ->
    if @validate(user, from)
      user = @getUser(user)
      if from == "howard chen"
        @cache.scores["@2chainz"]--
      @cache.scores[user]--
      @saveUser(user, from)

  scoreForUser: (user) ->
    user = @getUser(user)
    @cache.scores[user]

  saveScoreLog: (user, from) ->
    unless typeof @cache.scoreLog[from] == "object"
      @cache.scoreLog[from] = {}

    @cache.scoreLog[from][user] = new Date()

  isSpam: (user, from) ->
    @cache.scoreLog[from] ||= {}

    if !@cache.scoreLog[from][user]
      return false

    dateSubmitted = @cache.scoreLog[from][user]

    date = new Date(dateSubmitted)
    messageIsSpam = date.setSeconds(date.getSeconds() + 7200) > new Date()

    if !messageIsSpam
      delete @cache.scoreLog[from][user] #clean it up

    messageIsSpam

  validate: (user, from) ->
    user != from && user != "" && !@isSpam(user, from)

  length: () ->
    @cache.scoreLog.length

  top: (amount) ->
    tops = []

    for name, score of @cache.scores
      unless typeof score != "number"
        tops.push(name: name, score: score)

    tops.sort((a,b) -> b.score - a.score).slice(0,amount)

  bottom: (amount) ->
    all = @top(@cache.scores.length)
    all.sort((a,b) -> b.score - a.score).reverse().slice(0,amount)

module.exports = (robot) ->
  scoreKeeper = new ScoreKeeper(robot)

  robot.hear /([\w\S]+)([\W\s]*)?(\+\+)(.*)$/i, (msg) ->
    name = msg.match[1].trim()
    from = msg.message.user.name
    real_name = scoreKeeper.findUserByMentionName(name)

    if from == real_name
      msg.send "Don't be selfish, #{name}."
      return

    newScore = scoreKeeper.add(real_name, from)

    if newScore? then msg.send "#{name} has #{newScore} points."

  robot.hear /([\w\S]+)([\W\s]*)?(\-\-)(.*)$/i, (msg) ->
    name = msg.match[1].trim()
    from = msg.message.user.name
    real_name = scoreKeeper.findUserByMentionName(name)

    if from == real_name
      msg.send "Why are you minus minusing yourself, #{name}?"
      return

    newScore = scoreKeeper.subtract(real_name, from)
    if newScore? then msg.send "#{name} has #{newScore} points."

  robot.respond /score (for\s)?(.*)/i, (msg) ->
    name = msg.match[2].trim().toLowerCase()
    score = scoreKeeper.scoreForUser(name)

    msg.send "#{name} has #{score} points."

  robot.respond /(top|bottom) (\d+)/i, (msg) ->
    amount = parseInt(msg.match[2])
    message = []

    tops = scoreKeeper[msg.match[1]](amount)

    for i in [0..tops.length-1]
      message.push("#{i+1}. #{tops[i].name} : #{tops[i].score}")

    msg.send message.join("\n")

  robot.respond /scoreboard/i, (msg) ->
    message = []

    tops = scoreKeeper['top'](scoreKeeper.cache.scores.length)

    for i in [0..tops.length-1]
      message.push("#{i+1}. #{tops[i].name} : #{tops[i].score}")

    msg.send message.join("\n")

  robot.respond /mention name for (.*)$/i, (msg) ->
    person = msg.match[1]
    msg.send scoreKeeper.findMentionNameByUser(person)

  robot.respond /set mention name for \s (.*)/i, (msg) ->
    name = msg.match[2].trim()
    mention_name = msg.match[3].trim()
    scoreKeeper.setMentionName name, mention_name

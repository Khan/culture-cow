# Description:
#   Give, Take and List User Points
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   give <number> points to <username> - award <number> points to <username>
#   give <username> <number> points - award <number> points to <username>
#   take <number> points from <username> - take away <number> points from <username>
#   how many points does <username> have? - list how many points <username> has
#   take all points from <username> - removes all points from <username>
#   leaderboard - shows the leaderboard
#
# Author:
#   brettlangdon
#
award_points = (msg, username, pts) ->
    points = msg.robot.brain.data.points or {}
    points[username.toLowerCase()] ?= 0
    points[username.toLowerCase()] += parseInt(pts)
    send msg, pts + ' points Awarded To ' + username

save = (robot) ->
    robot.brain.data.points = points
    robot.brain.save()

send = (msg, text) ->
    if msg.robot.fromSelf msg
        return

    msg.robot.fancyMessage({
        msg: text,
        room: msg.envelope.room,
        from: "Game Gibbon",
        message_format: "text"
    });

module.exports = (robot) ->

    robot.hear /^give (\d+) points to (.*?)\s?$/i, (msg) ->
        award_points(msg, msg.match[2], msg.match[1])
        save(robot)

    robot.hear /^give (.*?) (\d+) points$/i, (msg) ->
        award_points(msg, msg.match[1], msg.match[2])
        save(robot)

    robot.hear /^take all points from (.*?)\s?$/i, (msg) ->
        username = msg.match[1]
        points = msg.robot.brain.data.points or {}
        points[username.toLowerCase()] = 0
        send msg, username + ' WHAT DID YOU DO?!'
        save(robot)

    robot.hear /^take (\d+) points from (.*?)\s?$/i, (msg) ->
         pts = msg.match[1]
         username = msg.match[2]

         points = msg.robot.brain.data.points or {}
         points[username.toLowerCase()] ?= 0

         if points[username.toLowerCase()] is 0
             send msg, username + ' Does Not Have Any Points To Take Away'
         else
             points[username.toLowerCase()] -= parseInt(pts)
             send msg, pts + ' Points Taken Away From ' + username

         save(robot)

    robot.hear /^how many points does (.*?) have\??$/i, (msg) ->
        username = msg.match[1]
        points = msg.robot.brain.data.points or {}
        points[username.toLowerCase()] ?= 0

        send msg, username + ' Has ' + points[username.toLowerCase()] + ' Points'

    robot.hear /^leaderboard$/i, (msg) ->
        points = msg.robot.brain.data.points or {}
        pointList = for name, amount of points
            [name, amount]
        
        compare = (a, b) ->
            if (a[1] > b[1])
                return -1
            if (a[1] < b[1])
                return 1
            return 0

        pointList.sort(compare)

        text = ""
        for p in pointList
            text += p[1] + "\t" + p[0] + "\n"

        send msg, text


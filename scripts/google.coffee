# Description:
#   Returns the URL of the first google hit for a query
# 
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   google <query> - Googles <query> & returns 1st result's URL
#
# Author:
#   searls

module.exports = (robot) ->
  robot.hear /^(google)( me)? (.*)/i, (msg) ->
    if robot.fromSelf msg
        return
    googleMe msg, msg.match[3], (url) ->
      text = "<a href='" + url + "'>" + url + "</a>"
      robot.fancyMessage({
        msg: text,
        room: msg.envelope.room,
        from: "Google Gibbon",
      });

googleMe = (msg, query, cb) ->
  msg.http('http://www.google.com/search')
    .query(q: query)
    .get() (err, res, body) ->
      cb body.match(/class="r"><a href="\/url\?q=([^"]*)(&amp;sa.*)">/)?[1] || "Sorry, Google had zero results for '#{query}'"

# Description:
#   Grab XKCD comic image urls
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   xkcd [latest]- The latest XKCD comic
#   xkcd <num> - XKCD comic <num>
#   xkcd random - XKCD comic <num>
#
# Author:
#   twe4ked
#   Hemanth (fixed the max issue)

send = (msg, text) ->
    msg.robot.fancyMessage({
        msg: text,
        room: msg.envelope.room,
        from: "Comic Colobus",
        message_format: "html"
    }); 

sendXkcd = (msg, object) ->
    text = object.title + "<br/><a href='"+ object.img + "'><img src='" + object.img + "'/></a><br/>" + object.alt
    send msg, text

module.exports = (robot) ->
  robot.hear /^xkcd(\s+latest)?$/i, (msg) ->
    msg.http("http://xkcd.com/info.0.json")
      .get() (err, res, body) ->
        if res.statusCode == 404
          send msg, 'Comic not found.'
        else
          object = JSON.parse(body)
          sendXkcd msg, object

  robot.hear /^xkcd\s+(\d+)$/i, (msg) ->
    num = "#{msg.match[1]}"

    msg.http("http://xkcd.com/#{num}/info.0.json")
      .get() (err, res, body) ->
        if res.statusCode == 404
          send msg, 'Comic #{num} not found.'
        else
          object = JSON.parse(body)
          sendXkcd msg, object

  robot.hear /^xkcd\s+random$/i, (msg) ->
    msg.http("http://xkcd.com/info.0.json")
          .get() (err,res,body) ->
            if res.statusCode == 404
               max = 0
            else
               max = JSON.parse(body).num 
               num = Math.floor((Math.random()*max)+1)
               msg.http("http://xkcd.com/#{num}/info.0.json")
               .get() (err, res, body) ->
                 object = JSON.parse(body)
                 sendXkcd msg, object

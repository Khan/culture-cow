# Description:
#   Allows hubot to answer almost any question by asking wolfram Alpha
#
# Dependencies:
#   "wolfram-node": "0.2.2"
#
# Configuration:
#   HUBOT_WOLFRAM_APPID - your AppID
#
# Commands:
#   wolfram|wfa <question> - Searches wolfram Alpha for the answer to the question
#
# Notes:
#   This may not work with node 0.6.x
#
# Author:
#   dhorrigan
wolfram = require('wolfram-node').init(process.env.HUBOT_WOLFRAM_APPID)

send = (msg, text) ->
    msg.robot.fancyMessage({
        msg: text,
        room: msg.envelope.room,
        from: "Wolfy wolfram",
        message_format: "html"
    }); 

module.exports = (robot) ->
  robot.hear /^(wolfram|wfa) (.*)$/i, (msg) ->
    data = {
        query : msg.match[2],
    };
    triesLeft = 3
    ask = (data) ->
         wolfram.ask data, (e, result) ->
            if e or result['error']
                error = e or result['error']
                console.log("wolfram error" + e)
                triesLeft -= 1
                if triesLeft
                    console.log("trying wolfram call again")
                    ask data
                else
                    send msg, "wolfram is down"
                return
            else if result and result['pod'] and result['pod'].length
                src = result['pod'][0]['subpod'][0]['img'][0]['$']['src']
                text = "<a href='" + src + "'><img src='" + src + "'/></a><br/>"

                src = result['pod'][1]['subpod'][0]['img'][0]['$']['src']
                text += "<a href='" + src + "'><img src='" + src + "'/></a>"

                send msg, text
            else 
                send msg, 'Hmm...not sure'

    ask data

# Description:
#   Retrieves random cat facts.
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   cat fact - Reply back with random cat fact.
#
# Author:
#   scottmeyer

module.exports = (robot) ->
    robot.hear /^CAT\s*FACT$/i, (msg) ->
        if not robot.fromSelf msg
            msg.http('http://catfacts-api.appspot.com/api/facts?number=1')
                    .get() (error, response, body) ->
                # passes back the complete reponse
                response = JSON.parse(body)
                if response.success == "true"
                	text = response.facts[0]
                else
                	text = "Unable to get cat facts right now."
                robot.fancyMessage({
                    msg: text,
                    room: msg.envelope.room,
                    from: "Kute Kitty",
                });

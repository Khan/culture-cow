var https = require("https"),
    querystring = require("querystring");

module.exports = function(robot) {
    // Attach a new message utility to robot, much like messageRoom, except
    // targetted at hipchat over the hipchat API. The hipchat API gives us more
    // flexibility than jabber when it comes to message formatting/coloring.
    // TODO(kamens): remove this and switch back to the jabber/built-in adapter
    // method of sending messages once customizability is added to that
    // pipeline.
    robot.messageHipchat = function(s) {
        var hipchat = {
                format: 'json',
                auth_token: process.env.HUBOT_HIPCHAT_TOKEN,
                room_id: "1s and 0s",
                message: s,
                from: "Culture Cow",
                color: "purple",
                message_format: "html"
            },
            params = querystring.stringify(hipchat),
            path = "/v1/rooms/message/?" + params;

        https.get({host: "api.hipchat.com", path: path}, function(res) {
            // TODO(kamens): handle errors'n'such
        });
    }
}

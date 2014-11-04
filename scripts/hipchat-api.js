var https = require("https"),
    querystring = require("querystring");

module.exports = function(robot) {

    robot.fromSelf = function(msg) {
        //For human users the user.id is numeric, when we send via
        //fancyMessage this is true.
        return msg.envelope.user.id === msg.envelope.user.name;
    };

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
            console.error('ERROR TALKING TO HIPCHAT:');
            console.error('   Sent: ' + path);
            console.error('   Status: ' + res.statusCode);
            console.error('   Headers: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.error('   Body: ' + chunk);
            });
        });
    };

    /**
     * robot.fancyMessage - a more versatile version of messageHipchat
     * @param  {Object} msg a message object with the fields
     *                      room - the room slug that hubot provides via
     *                              msg.message.envelope.room
     *                      msg - the actual html-formatted message to send
     *                      from - the name of your bot
     *                      color - one of [gray, purple, green, yellow, red, random]
     * @return {[type]}     [description]
     */
    robot.fancyMessage = function(msg) {
        if (!msg.msg) {
            console.error("no message provided, moooooo!");
            return;
        }

        // map msg.message.envelope.room to actual room without doing
        // an api lookup each time we call this function
        var rooms = {
                "1s_and_0s": "1s and 0s",
                "1s0s_deploys": "1s/0s: deploys",
                "exercise_internals": "Content tools",
                "mobile!": "Mobile!",
                "phoox": "Athena",
                "joshtest": "HipChat Tests",
                "jamestest": "jamestest"
            },
            hipchat = {
                format: 'json',
                auth_token: process.env.HUBOT_HIPCHAT_TOKEN,
                room_id: rooms[msg.room || "1s_and_0s"],
                message: msg.msg,
                from: msg.from || "Kvltvre Kow",
                color: msg.color || "purple",  // sic, pvrpvle
                message_format: msg.message_format || "html"
            },
            params = querystring.stringify(hipchat),
            path = "/v1/rooms/message/?" + params;

        https.get({host: "api.hipchat.com", path: path}, function(res) {
            if (res.statusCode !== 200) {
                console.error('ERROR TALKING TO HIPCHAT:');
                console.error('   Sent: ', hipchat);
                // see also https://www.hipchat.com/docs/api/response_codes
                console.error('   Status: ' + res.statusCode);
                console.error('   Headers: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.error('   Body: ' + chunk);
                });
            }
        });

    };
};

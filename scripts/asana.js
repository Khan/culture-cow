/**
 * Description:
 *   File tasks with asana.
 *
 * Dependencies:
 *   None
 *
 * Configuration:
 *   None
 *
 * Commands:
 *   sherpa: <new task title> - create a new support task with this title
 *
 * Author:
 *   csilvers
 */

var querystring = require("querystring");


var API_KEY = process.env.HUBOT_ASANA_APIKEY;

// This is taken from
//    curl -u '<api key>:' https://app.asana.com/api/1.0/workspaces
var KA_WORKSPACE_ID = '1120786379245';

// This is taken from
//    curl -u '<api key>:' https://app.asana.com/api/1.0/projects
var SUPPORT_PROJECT_ID = '27216215224639';


var ASANA_NAME_AND_EMAIL_MAP;

var withAsanaNameAndEmailMap = function(msg, callback) {
    if (ASANA_NAME_AND_EMAIL_MAP) {
        return callback(ASANA_NAME_AND_EMAIL_MAP);
    }

    console.log('Caching asana email information');
    msg.http("https://app.asana.com/api/1.0/users?opt_fields=name,email")
       .auth(API_KEY, '')
       .get()(function (err, res, body) {
           if (res && res.statusCode === 200) {
               var responseJson = JSON.parse(body);
               ASANA_NAME_AND_EMAIL_MAP = {};
               responseJson.data.forEach(function (user) {
                   ASANA_NAME_AND_EMAIL_MAP[user.name] = user.email;
                   ASANA_NAME_AND_EMAIL_MAP[user.email] = user.name;
               });
               return callback(ASANA_NAME_AND_EMAIL_MAP);
           }

           console.log('WARNING: error getting asana emails');
           console.log(error ? error : res.responseCode);
           callback({});
       });
};


var withUserToAsanaEmail = function(msg, hipchat_user, callback) {
    withAsanaNameAndEmailMap(msg, function(asanaNameAndEmailMap) {
        if (asanaNameAndEmailMap[hipchat_user.name]) {
            return callback(asanaNameAndEmailMap[hipchat_user.name]);
        }
        var fallbackEmail = hipchat_user.mention_name + "@khanacademy.org";
        if (asanaNameAndEmailMap[fallbackEmail]) {
            return callback(fallbackEmail);
        }
        console.error("No asana account found for " +
                      hipchat_user.mention_name +
                      " (" + hipchat_user.name + ")");
        console.error(asanaNameAndEmailMap);
        return callback("");
    });
};


var postTask = function(robot, msg, taskTitle, asanaEmail) {
    if (!asanaEmail) {
        robot.fancyMessage({
            msg: ("(sadpanda) FAILED: error talking to asana: " +
                  "could not figure out the asana account for " +
                  "@" + msg.envelope.user.mention_name),
            color: "red",
            message_format: "text",
            room: msg.envelope.room,
            from: "Support Sherpa"
        });
        return;
    }

    var postData = querystring.stringify({
        workspace: KA_WORKSPACE_ID,
        projects: SUPPORT_PROJECT_ID,
        name: taskTitle,
        notes: ("Submitted by " + asanaEmail + "\n\n" +
                "<< fill in more details here >>"),
        followers: asanaEmail
    });

    msg.http("https://app.asana.com/api/1.0/tasks")
       .auth(API_KEY, '')
       .header('Content-Type', 'application/x-www-form-urlencoded')
       .post(postData)(function (err, res, body) {
           var successString;
           var errorString;
           if (err) {
               console.error('ERROR TALKING TO ASANA: ' + err);
               errorString = err;
           } else if (res.statusCode >= 300) {
               console.error('ERROR TALKING TO ASANA:');
               console.error('   Status: ' + res.statusCode);
               console.error('   Headers: ' + JSON.stringify(res.headers));
               console.error('   Body: ' + body);
               errorString = "http status " + res.statusCode;
           } else {
               var responseJson = JSON.parse(body);
               var taskId = responseJson.data.id;
               var taskUrl = ("https://app.asana.com/0/" +
                              SUPPORT_PROJECT_ID + "/" + taskId);
               successString = ("Asana task added! " +
                                "Visit " + taskUrl + " to add more details");
           }
           if (errorString) {
               robot.fancyMessage({
                   msg: ("(sadpanda) FAILED: error talking to asana: " +
                         errorString),
                   color: "red",
                   message_format: "text",
                   room: msg.envelope.room,
                   from: "Support Sherpa"
               });
           } else {
               robot.fancyMessage({
                   msg: successString,
                   color: "purple",
                   message_format: "text",
                   room: msg.envelope.room,
                   from: "Support Sherpa"
               });
           }
       });
};


module.exports = function(robot) {
    // TODO(csilvers): allow setting tags and such using msg.match[1]
    robot.hear(/sherpa([^:]*): *(.*)/i, function(msg) {
        withUserToAsanaEmail(msg, msg.envelope.user, function(asanaEmail) {
            postTask(robot, msg, msg.match[2], asanaEmail);
        });
    });
};

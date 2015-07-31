const Trello = require('node-trello');
const Q = require('q');
const queueColumn = "Deploy Queue";
const runningColumn = "Running";
const doneColumn = "Completed";

const t = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

function getCards(trello, listId) {
    return Q.ninvoke(trello, "get", "/1/lists/" + listId, {cards: "open"})
        .then(function(data) { return data.cards; });
}

function getLists(trello, board) {
    return Q.ninvoke(trello, "get", "/1/boards/" + board, {lists: "open", list_fields: "name"})
        .then(function(data) { return data.lists; });
}

function getListIds(lists, desiredNames) {
    function nameMatches(name) {
        return function(el, idx, arr) {
            return el['name'] === name;
        };
    }
    var ids = [];
    for (var name of desiredNames) {
        ids.push(lists.find(nameMatches(name)).id);
    }
    return ids;
}

function getDeploymentState(trello, board) {
    return getLists(trello, board)
    .then(function(lists) {
        return getListIds(lists, [queueColumn, runningColumn, doneColumn]);
    }).then(function(ids) {
        const queueId = ids[0];
        const runningId = ids[1];
        return getCards(trello, queueId).then(function(queueCards) {
            return getCards(trello, runningId).then(function(runningCards) {
                return {queue: queueCards, running: runningCards};
            });
        });
    });
}

function updateDeploymentState() {
    getDeploymentState(t, secrets.board).then(function(state) {
        if (state.queue.length > 5) {
            console.log("There's a nasty backup on deployments.");
        }

        console.log("QUEUE");
        for (var card of state.queue) {
            console.log("\t" + card.name);
        }
        console.log("\n\nRUNNING");
        for (var card of state.running) {
            console.log("\t" + card.name);
        }
    }).done();
}

updateDeploymentState;

var queue = {

    DEBUG: true,    // <===== SET TO false FOR PRODUCTION AND REAL DEPLOYS!!!

    notes:
        [ "fyi  : res:{message:{}, robot:{}}"
        , "done : Long deploy queue? @mention everyone in the queue about merging simple commits"
        , "done : Skip someone in the queue and @mention them about it if they don't respond in X minutes"
        , "done : Remove users from the queue after a successful deploy"
        , "done : @mention the next person in queue after the previous deploy completes"

        , "polish"
        , "     td  : Create a Notifier interface and registration mechanism to enable notifying via HipChat, Slack, or something else."
        , "     td  : notify()  : use Notifier interface to notify via HipChat, Slack, or something else."
        , "     td  : changed() : accept a deploy queue string or array that's hipchat/slack/etc. agnostic"
        , "     td  : Use ES6 tagged template strings to update messages"
        ],

    messages:
        { empty : "${users}: deploy queue's empty!"
        , merge : "${users}: this deploy queue's long . . . Got simple commits? Why not merge?"
        , next  : "${users}: your turn to deploy. Auto-skipping in 5 minutes!"
        , skip  : "${users}: Sorry, team's waiting. Skipping you for now but you'll be up next"
        , slow  : "${users}: Sorry, this deploy's taking a while..."
        },

    patterns:
        { names     : (/\w+/gi)
        , success   : (/\[.+\] Mr Gorilla: (@\w) .* Deploy of .* succeeded!/)
        , test      : (/^test deploys/)
        , topic     : (/[+-\w]+\s+\|\s+\[.+\]/i)
        , users     : (/\${users}/)
        },

    deploying:
        { user  : null
        , since : null
        , SLOW  : 30*60*1000,    // 30 minutes in milliseconds
        },

    notifying:
        { user  : null
        , since : null
        , SLOW  : .25*60*1000,    //  5 minutes in milliseconds
        },


    activate: function activate (robot) {
        console.info ("todo: activate deploy listeners.");

        queue.DEBUG &&
        robot.hear  (queue.patterns.test,    queue.testIt);
        //robot.topic (queue.patterns.topic,   this.changed);
        robot.hear  (queue.patterns.topic,   queue.changed);
        robot.hear  (queue.patterns.success, queue.next);

        console.info ("done: activate deploy listeners.");
    },


    tooMany : 4,
    users   : null,

    changed: function changed (res) {
        console.log ("\n\nqueue changed\n\n");

        // Extract usernames from deploy queue message
        var users   = res.message.text.match (queue.patterns.topic)[0];
        users       = users.match (queue.patterns.names);
        queue.users = users;

        switch (true) {
            case !(users && users.length):
                queue.notify ({users: ['all'], message: queue.messages.empty});
                break;

            case users.length >= queue.tooMany:
                queue.notify ({users: users, message: queue.messages.merge});
                queue.changeState();
                break;

            default:
                queue.changeState();
                break;
        }

        console.info ("\n\nusers: " + users);
    },


    changeState: function changeState () {
        var deploying   = queue.deploying,
            notifying   = queue.notifying,
            user        = queue.users && queue.users [0];

        switch (true) {
            case !user:
                return;

            case deploying.user === user:
                (Date.now() - deploying.since >= deploying.SLOW) && queue.complain();
                return;

            case notifying.user === user:
                (Date.now() - notifying.since >= notifying.SLOW) && queue.skip();
                return;

            default:
                queue.next();
        }
    },


    complain: function complain () {
        queue.notify ({users:['all'], message:queue.messages.slow});
    },


    deploy: function deploy (user) {
        var deploying   = queue.deploying,
            users       = queue.users;

        deploying.user  = user;
        deploying.since = Date.now();

        !users && (users = []);
        (users[0] !== user) && users.unshift (user) && queue.changeState();
        console.info (users);
    },


    deployed: function deployed () {
        var deploying   = queue.deploying,
            users       = queue.users;

        deploying.user  = null;
        deploying.since = null;

        users && users.shift() && queue.changeState();
        console.info (users);
    },


    next: function next () {
        // Advance the deploy queue when a deploy successfully completes or someone takes too long to start a deploy.
        // todo: Update the queue in the HipChat room topic.
        
        var notifying   = queue.notifying,
            users       = queue.users,
            user        = users && users[0];

        if (!users || users.length <= 1) {
            return;
        }

        notifying.user  = user;
        notifying.since = Date.now();

        queue.notify ({users:[user], message: queue.messages.next});

        function autoSkip () {
            clearTimeout (skipper);
            queue.skip();
        }
        var skipper = setTimeout (autoSkip, notifying.SLOW);
    },


    notify: function notify (notice) {
        var users   = notice.users,
            message = notice.message;

        users   && (users   = '@' + users.join (' + @'));
        message && (message = message.replace (queue.patterns.users, users));

        console.info ("\n");
        console.info ("todo: notify: @mention users : " + users);
        console.info ("todo: notify: with message   : " + message);
        console.info ("queue : " + queue.users);
    },


    skip: function skip () {
        var notifying   = queue.notifying,
            users       = queue.users,
            user        = users && users.shift();

    try{ throw "\n\ndebugging skip()...\n\n"; }catch (e) { console.debug (e.stack); }
        
        
        notifying.user = notifying.since = null;
        users.splice (1, 0, user);
        queue.notify ({users: [user], message: queue.messages.skip});
        queue.next();
    },

    testIt: function testIt (res) {
        queue.deploying.SLOW = 1*60*1000;
        queue.notifying.SLOW = 7*1000;

        res.send ("\n\n### deploys test commands ###\n\n");
        res.send ("slow | [2,3,4]");
        res.send ("sun, deploy slow");
        res.send ("Deploy of <anything> succeeded!");
        res.send ("\n\n### deploys test commands ###\n\n");
    }

};//{queue}

module.exports = queue;

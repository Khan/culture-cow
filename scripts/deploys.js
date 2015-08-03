const Trello = require('node-trello');
const Q = require('q');
const queueColumn = "In Line";
const runningColumn = "Deploying";
const doneColumn = "Completed";

function _getCards(trello, listId) {
    return Q.ninvoke(trello, "get", "/1/lists/" + listId, {cards: "open"})
        .then(function(data) { return data.cards; });
}

function _getComments(trello, cardId) {
    return Q.ninvoke(trello, "get", "/1/cards/" + cardId + "/actions", {filter: "commentCard"});
}

function _addCard(trello, listId, title) {
    return Q.ninvoke(trello, "post", "/1/lists/" + listId + "/cards", {name: title});
}

function _moveCard(trello, cardId, listId, position) {
    var args = {idList: listId};
    if (position !== undefined) {
        args['pos'] = position;
    }
    return Q.ninvoke(trello, "put", "/1/cards/" + cardId, args);
}

function _commentOnCard(trello, cardId, comment) {
    return Q.ninvoke(trello, "post", "/1/cards/" + cardId + "/actions/comments", {text: comment});
}

function _getLists(trello, board) {
    return Q.ninvoke(trello, "get", "/1/boards/" + board, {lists: "open", list_fields: "name"})
        .then(function(data) { return data.lists; });
}

function _getListIds(lists, desiredNames) {
    var ids = [];
    var idMap = {};
    for (var list of lists) {
        idMap[list.name] = list.id;
    }
    for (var name of desiredNames) {
        ids.push(idMap[name]);
    }
    return ids;
}

var queue = {

    DEBUG: process.env.HUBOT_DEBUG,

    columnIds:
        { queueId: null
        , runningId: null
        , doneId: null
        },

    trello: null,

    severity: {
        HIGH: "HIGH",
        MEDIUM: "MEDIUM",
        LOW: "LOW"
    },

    notifyPatience: 30*1000,// 5*60*1000,

    deployPatience: 30*60*1000,

    notifierCallbacks: [],

    setSubjectCallbacks: [],

    subject: "",

    activate: function activate(robot) {
        queue.startMonitoring();
    },

    startDeploy: function deploy(user) {
        queue.getDeploymentState()
        .then(function(state) {
            var cardId = null;
            for (var card of state.queue) {
                var components = card.name.split("+");
                for (var name of components) {
                    if (name === user) {
                        cardId = card.id;
                    }
                }
            }
            if (cardId !== null) {
                _commentOnCard(queue.trello, cardId, "Beginning deploy!");
                _moveCard(queue.trello, cardId, queue.columnIds.runningId);
            }
        });
    },

    markSuccess: function markSuccess(user) {
        queue.getDeploymentState()
        .then(function(state) {
            _moveCard(queue.trello, state.running[0].id, queue.columnIds.doneId);
        });
    },

    markFailure: function markFailure(user) {
        _moveCard(queue.trello, queue.deploying.cardId, doneColumn);

        queue.deploying.user = queue.deploying.since = queue.deploying.cardId = null;
    },

    enqueue: function enqueue(user) {
        _addCard(queue.trello, queue.columnIds.queueId, user);
    },

    getDeploymentState: function deploymentState() {
        return _getCards(queue.trello, queue.columnIds.queueId).then(function(queueCards) {
            return _getCards(queue.trello, queue.columnIds.runningId).then(function(runningCards) {
                return {queue: queueCards, running: runningCards};
            });
        });
    },

    startMonitoring: function startMonitoring() {
        queue.trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);
        queue.initializeListIds().then(function() {
            setInterval(queue.monitor, 3000);
        }).done();
    },

    initializeListIds: function initializeListIds() {
        return _getLists(queue.trello, process.env.TRELLO_BOARD_ID)
        .then(function(lists) {
            return _getListIds(lists, [queueColumn, runningColumn, doneColumn]);
        }).then(function(ids) {
            queue.columnIds.queueId = ids[0];
            queue.columnIds.runningId = ids[1];
            queue.columnIds.doneId = ids[2];
        });
    },

    monitor: function monitor() {
        queue.getDeploymentState()
        .then(function(state) {
            queue.handleUserNotifications(state);
            queue.handleLongDeploy(state);
            queue.updateSubject(state);
        }).done();
    },

    handleUserNotifications: function handleUserNotifications(state) {
        if (state.running.length === 0 && state.queue.length > 0) {
            var card = state.queue[0];
            _getComments(queue.trello, card.id)
            .then(function(comments) {
                var lastComment = comments && comments[0] ? comments[0].data.text : "";
                var lastUpdated = Date.parse(card.dateLastActivity);
                if (lastComment.indexOf("Notified ") === 0 && (Date.now() - lastUpdated) > queue.notifyPatience) {
                    if (state.queue.length === 1) {
                        queue.notify(card.name, "hey, you know you're clear to deploy, right?", queue.severity.HIGH);
                        _commentOnCard(queue.trello, card.id, "Notified " + card.name + " again...");
                    } else {
                        queue.notify(card.name, "sorry; there are others in the queue, so sending you to the back", queue.severity.HIGH);
                        _commentOnCard(queue.trello, card.id, "Gave up on " + card.name);
                        queue.rotateDeploymentQueue(state);
                    }
                } else {
                    if (lastComment.indexOf("Notified ") !== 0) {
                        queue.notify(card.name, "you're up!", queue.severity.LOW);
                        _commentOnCard(queue.trello, card.id, "Notified " + card.name + " they're up");
                    }
                }
            });
        }
    },

    rotateDeploymentQueue: function rotateDeploymentQueue(state) {
        _moveCard(queue.trello, state.queue[0].id, queue.columnIds.queueId, 'bottom').done();
    },

    notify: function notify(user, message, severity) {
        for (var callback of queue.notifierCallbacks) {
            callback(user, message, severity);
        }
    },

    addNotificationCallback: function addNotificationCallback(notifier) {
        queue.notifierCallbacks.push(notifier);
    },

    updateSubject: function updateSubject(state) {
        var prefix = state.running.length === 1 ? state.running[0].name + " | " : "";
        var suffix = "[" + state.queue.map(function(card) { return card.name; }).join(", ") + "]";
        var subject = prefix + suffix;
        if (subject !== queue.subject) {
            queue.subject = subject;
            queue.setSubject(subject);
        }
    },

    setSubject: function setSubject(subject) {
        for (var callback of queue.setSubjectCallbacks) {
            callback(subject);
        }
    },

    addSubjectCallback: function addSubjectUpdater(updater) {
        queue.setSubjectCallbacks.push(updater);
    }
};

module.exports = queue;

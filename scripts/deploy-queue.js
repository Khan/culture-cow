/**
 * Description:
 *   Manages a Trello-backed deployment queue.  Specifically, rather
 *   than forcing Khan devs to manually muck around with the HipChat
 *   topic in the 1 and 0s deploy room, this instead backs the queue
 *   with the Trello board https://trello.com/b/wE7cxYDT.  Users can
 *   add themselves to the queue and manipulate the queue, either from
 *   this module or directly on the Trello board. Each card represents
 *   a single user who is waiting in line.
 *
 *   Other modules (e.g. sun.js at the moment) can register themselves
 *   via callbacks to this module to be aware when the queue changes.
 *   This module does not itself do any deploys.
 *
 * Dependencies:
 *   Q, node-trello
 *
 * Configuration:
 *   None
 *
 * Author:
 *   benjaminpollack, mikelee
 */

const Trello = require('node-trello');
const Q = require('q');
const queueColumn = "In Line";
const runningColumn = "Deploying";
const doneColumn = "Completed";

// main Queue singleton
var queue = {
    // Possible message severities, for use with callbacks registered by
    // addNotificationCallback.
    severity: {
        HIGH: "HIGH",
        MEDIUM: "MEDIUM",
        LOW: "LOW"
    },

    // Constructor; should be called exactly one time to instantiate the
    // singleton.  The parameter passed in is *not* used, but allows directly
    // using this module with Hubot's registry mechanism for debugging purposes
    // more easily.
    activate: function activate(robot) {
        queue.startMonitoring();
    },

    // Registers a subject change callback. The callback should take a single
    // parameter, which is the new subject.
    addSubjectCallback: function addSubjectCallback(updater) {
        queue._setSubjectCallbacks.push(updater);
    },

    // Adds a notification callback. To allow this module to work equally
    // well with HipChat and Slack, we expect that a relevant bot system
    // registers a preferred mechanism for sending notifications.  The callback
    // is expected to have the form cb(user, message, severity), where severity
    // is one of queue.severity's states.
    addNotificationCallback: function addNotificationCallback(notifier) {
        queue._notifierCallbacks.push(notifier);
    },

    // Marks a deploy as in progress and moves the user's card to the running
    // column.  The user passed in should be a string that reflects a card that
    // already exists in the queue column on the Trello board, but if none
    // exists, one will be created.
    startDeploy: function startDeploy(user) {
        queue.getDeploymentState()
            .then(function(state) {
                var cardId = null;
                for (var card of state.queue) {
                    var components = card.name.split("+");
                    for (var name of components) {
                        if (name === user) {
                            cardId = card.id;
                            break;
                        }
                    }
                }
                if (cardId !== null) {
                    _commentOnCard(queue.trello, cardId, "Beginning deploy!").done();
                    _moveCard(queue.trello, cardId, queue._columnIds.runningId).done();
                } else {
                    // no card was found, so make one
                    _addCard(queue.trello, queue._columnIds.runningId, user).done();
                }
            });
    },

    // Mark the given user's deploy as successful.  If the user is not marked
    // as running, then this is a no-op.
    markSuccess: function markSuccess(user) {
        queue.getDeploymentState()
            .then(function(state) {
                var cardId = null;
                for (var card of state.running) {
                    var components = card.name.split("+");
                    for (var name of components) {
                        if (name === user) {
                            cardId = card.id;
                            break;
                        }
                    }
                }
                if (cardId !== null) {
                    _commentOnCard(queue.trello, cardId, "Deploy succeeded!").done();
                    _moveCard(queue.trello, cardId, queue._columnIds.doneId).done();
                }
            });
    },

    // Mark the given user's deploy as unsuccessful.  If the user is not marked
    // as running, then this is a no-op.
    markFailure: function markFailure(user) {
        queue.getDeploymentState()
            .then(function(state) {
                var cardId = null;
                for (var card of state.running) {
                    var components = card.name.split("+");
                    for (var name of components) {
                        if (name === user) {
                            cardId = card.id;
                            break;
                        }
                    }
                }
                if (cardId !== null) {
                    _commentOnCard(queue.trello, cardId, "Deploy failed!").done();
                    _moveCard(queue.trello, cardId, queue._columnIds.queueId, "top").done();
                }
            });
    },

    // Add a given user to the queue by creating a new card with their name
    // in the "In Line" column of the Trello board
    enqueue: function enqueue(user) {
        _addCard(queue.trello, queue._columnIds.queueId, user);
    },

    // Return a promise that returns an object representing the deployemtn
    // state.  The object has two lists, called "queue" and "running", that
    // contain an ordered list of who's in the queue and who's running.
    // Theoretically, only one should be marked running at a time.
    getDeploymentState: function getDeploymentState() {
        return _getCards(queue.trello, queue._columnIds.queueId).then(function(queueCards) {
            return _getCards(queue.trello, queue._columnIds.runningId).then(function(runningCards) {
                return {queue: queueCards, running: runningCards};
            });
        });
    },

    // Internal use. Causes deploy-queue to start monitoring the Trello
    // board for changes, and to take appropriate actions (e.g., notifying
    // a user they're up).
    startMonitoring: function startMonitoring() {
        queue.trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);
        queue._initializeListIds().then(function() {
            setInterval(queue._monitor, queue._trelloQueryRate);
        }).done();
    },

    // Stores a mapping from the desired list names to their
    // internal Trello IDs so we don't have to look them up constantly.
    _initializeListIds: function _initializeListIds() {
        return _getLists(queue.trello, process.env.TRELLO_BOARD_ID)
            .then(function(lists) {
                return _getListIds(lists, [queueColumn, runningColumn, doneColumn]);
            }).then(function(ids) {
                queue._columnIds.queueId = ids[0];
                queue._columnIds.runningId = ids[1];
                queue._columnIds.doneId = ids[2];
            });
    },

    // Steps the state machine based on the Trello baord state,
    // taking whatever action is appropriate based on the time and board state.
    // This function is idempotent, and should only send notifications or alter
    // the state if it's necessary.
    _monitor: function _monitor() {
        queue.getDeploymentState()
            .then(function(state) {
                queue._handleUserNotifications(state);
                queue._updateSubject(state);
            }).done();
    },

    // Notifies users that they're up or that they're losing their
    // spot in the queue.
    _handleUserNotifications: function _handleUserNotifications(state) {
        if (state.running.length === 0 && state.queue.length > 0) {
            var card = state.queue[0];
            _getComments(queue.trello, card.id)
                .then(function(comments) {
                    var lastComment = comments && comments[0] ? comments[0].data.text : "";
                    var lastUpdated = Date.parse(card.dateLastActivity);
                    if (lastComment.indexOf("Notified ") === 0 && (Date.now() - lastUpdated) > queue._notifyPatience) {
                        if (state.queue.length === 1) {
                            queue._notify(card.name, "hey, you know you're clear to deploy, right?", queue.severity.HIGH);
                            _commentOnCard(queue.trello, card.id, "Notified " + card.name + " again...");
                        } else {
                            queue._notify(card.name, "sorry; there are others in the queue, so sending you to the back", queue.severity.HIGH);
                            _commentOnCard(queue.trello, card.id, "Gave up on " + card.name);
                            queue._rotateDeploymentQueue(state);
                        }
                    } else {
                        if (lastComment.indexOf("Notified ") !== 0) {
                            queue._notify(card.name, "you're up!", queue.severity.LOW);
                            _commentOnCard(queue.trello, card.id, "Notified " + card.name + " they're up");
                        }
                    }
                });
        }
    },

    // Rotates the deployment queue, sending whoever's at the front
    // to the back. Should only be called by handleUserNotifications.
    _rotateDeploymentQueue: function _rotateDeploymentQueue(state) {
        _moveCard(queue.trello, state.queue[0].id, queue._columnIds.queueId, 'bottom').done();
    },

    // Sends a message to the chat client. To enable future
    // flexibility, this function doesn't directly send anything; instead, it
    // relies on at least one module having registered a callback.
    _notify: function _notify(user, message, severity) {
        for (var callback of queue._notifierCallbacks) {
            callback(user, message, severity);
        }
    },

    // Updates the subject to reflect the current state of the
    // deployment queue.
    _updateSubject: function _updateSubject(state) {
        var prefix = (state.running.length === 1 ? state.running[0].name : " -- ") + " | ";
        var suffix = "[" + state.queue.map(function(card) {
                return card.name;
            }).join(", ") + "]";
        var subject = prefix + suffix + " (alter the queue manually at https://trello.com/b/wE7cxYDT)";
        if (subject !== queue._subject) {
            queue._subject = subject;
            queue._setSubject(subject);
        }
    },

    // Sets the subject to an arbitrary string. Note that this relies
    // on at least one subject change handler having been registered by
    // addSubjectCallback.
    _setSubject: function _setSubject(subject) {
        for (var callback of queue._setSubjectCallbacks) {
            callback(subject);
        }
    },

    // Trello list IDs for the three lists we care about
    _columnIds: {
        queueId: null,
        runningId: null,
        doneId: null
    },

    // Singleton for holding Trello auth creds
    _trello: null,

    // How long, in milliseconds, to wait for someone to begin a deploy before
    // giving up on them.
    _notifyPatience: 5 * 60 * 1000,

    // How long, in milliseconds, to wait for a deploy to finish before whining
    // about it publicly.
    _deployPatience: 30 * 60 * 1000,

    // How often, in milliseconds, to query Trello for changes
    _trelloQueryRate: 3 * 1000,

    // A list of functions to be called whenever the notification queue wants
    // to send a message.  See addNotificationCallback for more information.
    _notifierCallbacks: [],

    // A list of functions to be called whenever the notification queue wants
    // to set the room subject.  See addSubjectCallback for more information.
    _setSubjectCallbacks: [],

    // Current subject.  Used to avoid spurious subject changes.
    _subject: ""
};


// Returns a Promise to return a list of all cards in the given list.
function _getCards(trello, listId) {
    return Q.ninvoke(trello, "get", "/1/lists/" + listId, {cards: "open"})
        .then(function(data) {
            return data.cards;
        });
}

// Returns a Promise to return all comments on a given card.
function _getComments(trello, cardId) {
    return Q.ninvoke(trello, "get", "/1/cards/" + cardId + "/actions", {filter: "commentCard"});
}

// Asynchronously adds a card with the given title.
function _addCard(trello, listId, title) {
    return Q.ninvoke(trello, "post", "/1/lists/" + listId + "/cards", {name: title});
}


// Returns a promise with the result of trying to move a card to the given
// list.  Position is optional; if not provided, the card is added to the top
// (the Trello default).
function _moveCard(trello, cardId, listId, position) {
    var args = {idList: listId};
    if (position !== undefined) {
        args['pos'] = position;
    }
    return Q.ninvoke(trello, "put", "/1/cards/" + cardId, args);
}

// Returns a promise with the result of adding the given comment
// to the card.
function _commentOnCard(trello, cardId, comment) {
    return Q.ninvoke(trello, "post", "/1/cards/" + cardId + "/actions/comments", {text: comment});
}

// Returns a promise to return a list of all lists on the given
// board.
function _getLists(trello, board) {
    return Q.ninvoke(trello, "get", "/1/boards/" + board, {lists: "open", list_fields: "name"})
        .then(function(data) {
            return data.lists;
        });
}

// Given a collection of Trello lists (e.g. from the _getLists call,
// although any JSON from any Trello API call that returns lists (e.g. the
// board detail request) will work), returns the Trello list IDs for the Trello
// boards specified in desiredNames, in that order. For example, if you passed
// in a lists collection that included a list named "Bob" with ID 123 and one
// named "Susan" with ID 456, then _getListIds(lists, ["Susan", "Bob"]) would
// return ["456", "123"]. This is written in this manner to allow for easy
// destructuring binds...which the Node version on toby can't currently do. But
// one day.
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

module.exports = queue;

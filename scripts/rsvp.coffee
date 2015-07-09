# Description:
#   Easy RSVP bot.
#
# Commands:
#   rsvp create <event>
#   rsvp add <event> <name>
#   rsvp show <event> (--short)
#   rsvp delete <event>
#   rsvp remove <event> <name>
#   rsvp list (--short)
#
# Authors:
#   neel, anastassia

_ = require('underscore')

# Utility class that interacts with the Hubot robot
class RsvpKeeper
    constructor: (@robot) ->
        @robot.brain.on 'loaded', =>
            @robot.brain.data.events ||= {}

        # We have to load the brain again after attaching the event handler
        # above since only on a load does the brain emit the 'loaded' event
        fileBrain = require('./file-brain')(@robot)

        # shortcut to brain data
        @data = @robot.brain.data

    # saves robot state so it can carry across rooms
    # call after changing robot state
    _save: () ->
        @robot.brain.emit('save', @data)
        @data.events

    # returns true if the event with the given name exists, false otherwise
    has: (eventName) ->
        @data.events[eventName]?

    # deletes ALL events. don't expose this to users! only use for testing.
    clear: () ->
        @data.events = {}
        @_save()

    # creates a new event
    # returns true if the event was created, or false if there is already
    # an event with the given name
    create: (eventName) ->
        if @has eventName
            false
        else
            @data.events[eventName] =
                attendees: []
            @_save()
            true

    # adds a user to an event
    # returns true if the user was added, or false if the event does not exist
    # or if the user has already been added to the event
    add: (eventName, userName) ->
        if @has(eventName) and not
                (_.contains @data.events[eventName].attendees, userName)
            @data.events[eventName].attendees.push userName
            @_save()
            true
        else
            false

    # returns an array of all attendees of an event, or null if the event
    # does not exist
    show: (eventName) ->
        if @has eventName
            # by default, JavaScript sorts by Unicode point order,
            # which puts capitals first, e.g., 'C' before 'b'!
            # we want to sort case-insensitively, hence this comparator function
            @data.events[eventName].attendees.sort (a, b) ->
                a.toLowerCase() > b.toLowerCase()
        else
            null

    # deletes an event
    # returns true if the event was successfully deleted, or false if the event
    # does not exist
    delete: (eventName) ->
        if @has eventName
            delete @data.events[eventName]
            @_save()
            true
        else
            false

    # removes a user from an event
    # returns true if the user was successfully removed, or false if that user
    # was never a member of the given event or if that event never existed
    # in the first place
    remove: (eventName, userName) ->
        event = @data.events[eventName]
        if event? and _.contains event.attendees, userName
            event.attendees = _.without event.attendees, userName
            @_save()
            true
        else
            false

    # returns an array of all tracked events
    list: () ->
        unsorted = _.map @data.events, (val, key) ->
            name: key,
            attendees: val.attendees
        _.sortBy unsorted, (event) -> event.name.toLowerCase()

# robot utilities

# extracts capture groups from the given message
extract = (message) ->
    message.match[1..]

module.exports = (robot) ->
    rsvpKeeper = new RsvpKeeper(robot)

    # tracks everything this robot listens to
    listeners = []
    # a wrapper around robot.hear that also allows us to track the listeners
    # that have been added, so that we can programmatically call them
    # and test the output. yay unit testing!
    addListener = (regex, handler) ->
        listeners.push
            regex: regex
            handler: handler
        robot.hear regex, (msg) ->
            msg.send(handler msg)

    # calls the listener for the given message and outputs the handler's output,
    # effectively simulating sending and receiving messages from the robot!
    # e.g. simulateMessage("rsvp create party") == "Created event party!"
    simulateMessage = (message) ->
        output = ""
        for listener in listeners
            match = listener.regex.exec(message)
            if match?
                # the robot would hear this message!
                output = listener.handler
                    match: match
        output

    # rsvp create <event>
    addListener /^rsvp\s+create\s+(\S+)$/i, (msg) ->
        [event] = extract msg
        created = rsvpKeeper.create event
        if created
            "Created event #{event}!"
        else
            "There's already an event called #{event}!"

    # rsvp add <event> <name>
    addListener /^rsvp\s+add\s+(\S+)\s+(.+)$/i, (msg) ->
        [event, user] = extract msg
        if rsvpKeeper.has event
            added = rsvpKeeper.add event, user
            if added
                "#{user} has RSVP'd to #{event}!"
            else
                "#{user} has already RSVP'd to #{event}!"
        else
            "There's no event called #{event}!"

    # rsvp show <event> (--short)
    addListener /^rsvp\s+show\s+(\S+)(\s+--short)?$/i, (msg) ->
        [event, short] = extract msg
        attendees = rsvpKeeper.show event
        if attendees != null
            output ="Who's RSVP'd for #{event}:"
            if attendees.length == 0
                output += "\nNo one :("
            else
                output += "\n" + if short?
                    attendees.join ", "
                else
                    ("- #{attendee}" for attendee in attendees).join "\n"
            output
        else
            "There's no event called #{event}!"

    # rsvp delete <event>
    addListener /^rsvp\s+delete\s+(\S+)$/i, (msg) ->
        [event] = extract msg
        deleted = rsvpKeeper.delete event
        if deleted
            "Deleted event #{event}!"
        else
            "There's no event called #{event}!"

    # rsvp remove <event> <name>
    addListener /^rsvp\s+remove\s+(\S+)\s+(.+)$/i, (msg) ->
        [event, user] = extract msg
        if rsvpKeeper.has event
            removed = rsvpKeeper.remove event, user
            if removed
                "#{user} has unRSVP'd from #{event}!"
            else
                "#{user} never RSVP'd to #{event}!"
        else
            "There's no event called #{event}!"

    # rsvp list (--short)
    addListener /^rsvp\s+list(\s+--short)?$/i, (msg) ->
        [short] = extract msg
        events = rsvpKeeper.list()
        output = "All events:"
        if events.length == 0
            output += "\nNone yet :("
        else
            output += "\n" + if short?
                (event.name for event in events).join(", ")
            else
                ("- #{event.name}" for event in events).join "\n"
        output

    # rsvp test
    # run all the unit tests!
    testHandler = (msg) ->
        # mini assertion utility
        failedTests = []
        # asserts that `value` == `expected`, ignoring newlines or spaces
        assert = (testName, value, expected) ->
            clean = (str) -> str.replace(/[ \n]/g, "")
            if clean(value) != clean(expected)
                failedTests.push testName

        # run tests
        rsvpKeeper.clear()
        simulateMessage "rsvp create party"
        assert "rsvp show without attendees",
            simulateMessage("rsvp show party"),
            "Who's RSVP'd for party: No one :("
        simulateMessage "rsvp add party neel"
        simulateMessage "rsvp add party sal khan"
        assert "rsvp show with attendees",
            simulateMessage("rsvp show party"),
            "Who's RSVP'd for party: - neel - sal khan"
        assert "rsvp show --short",
            simulateMessage("rsvp show party --short"),
            "Who's RSVP'd for party: neel, sal khan"
        simulateMessage "rsvp create dinner"
        assert "rsvp list with events",
            simulateMessage("rsvp list"),
            "All events: - dinner - party"
        simulateMessage "rsvp remove party neel"
        simulateMessage "rsvp remove party sal khan"
        assert "rsvp remove error checking (no person)",
            simulateMessage("rsvp remove party NONE"),
            "NONE never RSVP'd to party!"
        assert "rsvp remove",
            simulateMessage("rsvp show party"),
            "Who's RSVP'd for party: No one :("
        assert "rsvp create error checking",
            simulateMessage("rsvp create party"),
            "There's already an event called party!"
        simulateMessage "rsvp delete party"
        simulateMessage "rsvp delete dinner"
        assert "rsvp delete",
            simulateMessage("rsvp list"),
            "All events: None yet :("
        assert "rsvp delete error checking",
            simulateMessage("rsvp delete NONE"),
            "There's no event called NONE!"
        assert "rsvp add error checking (no event)",
            simulateMessage("rsvp add NONE neel"),
            "There's no event called NONE!"
        assert "rsvp remove error checking (no event)",
            simulateMessage("rsvp remove NONE neel"),
            "There's no event called NONE!"
        assert "rsvp show error checking",
            simulateMessage("rsvp show NONE"),
            "There's no event called NONE!"

        # finish up
        if failedTests.length == 0
            "All tests passed!"
        else
            "Failed tests:\n" + failedTests.join("\n")

    # NOTE(neel): uncomment this line in dev, as it allows you to run a unit
    # test suite with `rsvp test`, but comment it out in prod because users
    # don't need to run unit tests (plus, running the test suite clears all
    # data!)
    # addListener /^rsvp\s+test$/i, testHandler

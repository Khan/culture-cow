/**
 * A steady drip of Khan Academy culture, straight into HipChat's veins.
 *
 * "@CultureCow culture us" to get your hit of culture on demand.
 */

// STOPSHIP(kamens): more content

var culturalMsgs = [
    "[Shipping beats perfection].",
    "Have anything to demo at the next company all-hands? Everything that's shipped to real users is eligible. Show off!",
    "[Be open, share your work].",
    "It's ok to leave (or simply not attend) any meeting that you don't feel is important for you.",
    "Anybody can fix anything. (And anybody can run a [FIXIT] for themselves or their team.)",
    "Wanna teach the team about anything? Spread good habits? Show off what you're building? Sign up for an exalted speaker slot during dev sitdown.",
    "Shipping anything sizable? [Dogfood] it! Setup a dogfood hour, ping in hipchat to gather consumers of said dogfood, profit.",
    ],
    morningCultureHour = 10  // hour of morning (pacific time) at which to send

module.exports = function(robot) {

    var msPerDay = 1000 * 60 * 60 * 24,
        msgIndex = randInt(0, culturalMsgs.length - 1);

    /**
     * Send a single culture tidbit and queue up the next one.
     */
    function sendCultureMessage() {
        var s = "(cow) " + culturalMsgs[msgIndex] + " Moooo."
        robot.messageRoom(null, s);

        msgIndex++;
        if (msgIndex >= culturalMsgs.length) {
            msgIndex = 0;
        }
    };

    /**
     * Start dripping culture tidbits now and forever, once per day.
     */
    function startCultureDrip() {       
        // Send one culture message every day
        setInterval(sendCultureMessage, msPerDay);
        // And send one right now.
        sendCultureMessage();
    }

    // Send one culture message whenever requested
    robot.respond(/culture us$/i, function(msg) {
        sendCultureMessage();
    });

    setTimeout(startCultureDrip, msUntilMorning());
}

/**
 * Rand int generation, inclusive of min/max
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return milliseconds between now and sometime (10/11am PST) the next morning.
 */
function msUntilMorning() {
    var now = new Date(),
        later = new Date(),
        pacificUTCOffset = 7;  // not worrying about DST for now

    later.setUTCHours(morningCultureHour + pacificUTCOffset);
    later.setUTCMinutes(0);

    return Math.abs(later - now);
}

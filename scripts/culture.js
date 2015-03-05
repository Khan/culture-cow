/**
 * Description:
 *   A steady drip of Khan Academy culture, straight into HipChat's veins.
 *
 * Dependencies:
 *   None
 *
 * Configuration:
 *   None
 *
 * Commands:
 *   @CultureCow culture us - get your hit of culture on demand
 *
 * Author:
 *   kamens
 */



var culturalMsgs = [
    "<a href='https://sites.google.com/a/khanacademy.org/forge/for-developers'>Shipping beats perfection</a>.",
    "Iterate on ideas before diving into code. <a href='http://www.designstaff.org/articles/product-design-sprint-day-2-diverge-2012-10-26.html'>Design sprints</a> are being organized by Jason and others and work well for both huge projects and small features.",
    "Concerned about the hacks in our code? Upset that the product's not good enough? Have no fear, we're getting better fast. Our site used to <a href='https://s3.amazonaws.com/KA-share/old.png'>look like this</a> and it was generated by one big main.py file.",
    "<a href='https://sites.google.com/a/khanacademy.org/forge/for-khan-employees/-new-employees-onboard-doc/general-setup/welcome-to-ka'>Our core company values.</a>",
    "Have anything to demo at the next Monday all-hands? Everything that's shipped to real users is eligible. Show off.",
    "<a href='https://sites.google.com/a/khanacademy.org/forge/for-developers'>Be open, share your work</a>.",
    "It's ok to leave (or simply not attend) any meeting that you don't feel is important for you.",
    "<a href='https://sites.google.com/a/khanacademy.org/forge/for-khan-employees/email-transparency'>Email transparency</a> makes it easy for anybody to follow the goings on of teams they're interested in. <a href='https://groups.google.com/a/khanacademy.org/forum/#!forumsearch/(email-transparency)'>Join any list</a>.",
    "As a cow, I am fairly proud of having written our <a href='https://docs.google.com/a/khanacademy.org/document/d/1P6fweXJpYFAaE8nXrAVA9mt8qx7vHlUDo-OMtxmViAQ/edit'>Career Development doc</a>. Hard to do w/ just hooves.",
    "Keep learning — <a href='https://sites.google.com/a/khanacademy.org/forge/for-khan-employees/conferences'>we'll send you to conferences to do so</a>.",
    "Anybody can fix anything. (And anybody can run a <a href='https://gist.github.com/spicyj/8df622f1d18b4cc8f71b'>FIXIT</a> for themselves or their team.)",
    "Wading into some old code that's really disgusting compared to your brilliant new feature? You don't have to fix everything all at once. \"Leave it better\" and use # TODOs liberally. (Ben says he's sorry for the old code.)",
    "Wanna teach the team about anything? Spread good habits? Show off what you're building? <a href='http://khanacademy.org/r/speaknow'>Sign up to Speak Now</a> in the future after Wednesday's dev sitdown!",
    "Will just leave these <a href='https://www.khanacademy.org/stories'>users stories here</a>.",
    "Do you need anything to do your job well? Hardware? Software? Food? Coach K bobblehead for your desk? <a href='https://sites.google.com/a/khanacademy.org/forge/for-khan-employees/how-to-buy-software-hardware-anything-you-need-to-get-your-job-done-well'>It's easy to get whatever you need</a>, and if you have any trouble ping Kamens quickly.",
    "Shipping anything sizable? <a href='http://www.joelonsoftware.com/articles/fog0000000012.html'>Dog food</a> it! Schedule a dogfooding hour, ping in hipchat to gather friendly eaters of dog food, profit.",
    "<a href='https://docs.google.com/a/khanacademy.org/document/d/1k3RsaJ-Kg8XHResndCDwZDS-5jxNUk6T4SfZBa5RVXg/edit'>What are we building? How do we think about growth? How do we think about classrooms? How quickly should we expand our content?</a>",
    "<a href='https://sites.google.com/a/khanacademy.org/forge/technical/performance'>Performance is a feature</a> and is everyone's job. Unsure how to profile your code? No worries, just ask, we have some perf nuts on the team.",
    "Anybody can <a href='https://sites.google.com/a/khanacademy.org/forge/for-developers/deployment-guidelines'>own a deploy</a>. If you've got big changes going out, you're probably that anybody. I (Culture Cow), may one day even keep track of a deploy count leaderboard and spit it out here!",
    "<a href='http://arguingwithalgorithms.blogspot.com/2013/03/coding-for-review.html'>Write code with your reviewer in mind.</a>",
    "Recruiting is everyone's job. <a href='http://missmarcialee.com/2013/04/on-building-a-better-product-team-letter-style/'>Blogging about recruiting being everyone's job</a> is Marcia's job.",
    "<a href='http://www.fraustollc.com/blog/shit_code/'>\"Sure there's some bad code around, we've all seen it, hell we've all written it...If there is some smelly code out there, look for ways to make it better. Start by understanding the code, and then find ways to improve upon it.\"</a>",
    "<a href='http://bjk5.com/post/3994859683/code-reviews-as-relationship-builders-a-few-tips'>Code reviews can make people happy.</a>",
    "@john created <a href='http://ejohn.org/blog/gittip-at-khan-academy/'>a way for all KA folks to give back to open source projects</a> that we lean on. <a href='https://docs.google.com/a/khanacademy.org/spreadsheet/ccc?key=0ApubWHv0aMirdE9LODNJY0s4WXpXSlVYLVhrNmdocWc&usp=drive_web#gid=0'>Setup your recurring donations</a>.",
    "Nobody needs permission to take an occasional brain break by working on a FIXIT task that's been bugging you or anything else valuable that's not on your main project's critical path.",
    "Record our most amusing conversations for posterity in the <a href='https://docs.google.com/a/khanacademy.org/document/d/13bVo73p_qNTAFJKEXT-z6K_X8bAeOpzqXhopg9lDb-g/edit'>Funny Quotes file</a>!",
    "Wanna run a usability test? DO EET. @jason's written a <a href='https://docs.google.com/a/khanacademy.org/document/d/1HdnGR6V2vuwxlXswIPAZJ0_R0aXIXn5zhPXv9FTC8NY/edit'>step-by-step guide to usability testing at KA</a>.",
    "DRI for a significant project? Make sure it's on the big whiteboard so you can share with the rest of the team during dev sitstand updown.",
    "Wondering what the heck people are talking about when they encourage you to plan your upcoming engineering milestones? Here're a <a href='https://docs.google.com/a/khanacademy.org/document/d/10TDINtq27bCMRTLMOCeNydyCM8U_JKlGUcZFr62luIw/edit'>few</a> <a href='https://docs.google.com/a/khanacademy.org/document/d/1yra9IgIcagbZtQ2lO8_SmdUlfYgHX0OZCKAdqFaKYEg/edit#heading=h.gojm65fhaxoq'>good</a> <a href='https://docs.google.com/a/khanacademy.org/document/d/1PEwMhzqyzUteFtmJnbSUZd2oaZAJW8y-0ODp-BN-0i4/edit'>examples</a> - and Ben's always available to talk about planning.",
    "<a href='http://dashboards.khanacademy.org/is-ka-fast-yet'>Is Khan Academy Fast Yet?</a>",
    "Are you stuck in <a href='https://twitter.com/kamens/status/529443780273786881'>google account limbo?!</a> Try adding <code>?authuser=1</code> to that drive url you tried to access with your personal gmail account"
    ],
    morningCultureHour = 10; // hour of morning (pacific time) at which to send

module.exports = function(robot) {

    var msPerDay = 1000 * 60 * 60 * 24,
        msgIndex = randInt(0, culturalMsgs.length - 1);

    /**
     * Send a single culture tidbit and queue up the next one.
     */
    function sendCultureMessage(msg) {
        var urlCultureCowEmoticon = "https://dujrsrsgsd3nh.cloudfront.net/img/emoticons/6574/culture-1376771657.png",
            s = ("<img src='" + urlCultureCowEmoticon + "'>&nbsp;" +
                    culturalMsgs[msgIndex] + " Moooo.");

        var genesisDevice = {
            "msg": s,
            // the default for 'room' in fancyMessage is 1s & 0s
            "room": msg ? msg.envelope.room : null,
            "color": "purple",
            "from": "Culture Cow",
        };
        robot.fancyMessage(genesisDevice);

        msgIndex++;
        if (msgIndex >= culturalMsgs.length) {
            msgIndex = 0;
        }
    }

    /**
     * Send a single culture tidbit IFF it's not the weekend. Cows don't work
     * on weekends.
     */
    function sendCultureMessageIfWeekday() {
        // Ignoring timezone issues in this fxn for now, as UTC's day of week
        // will always be the same as Pacific's when this is run ~10am.
        // TODO(kamens): handle timezone issues.
        var now = new Date(),
            day = now.getUTCDay();  // 0 = Sunday, ..., 6 = Saturday
        if (day !== 0 && day !== 6) {
            sendCultureMessage();
        }
    }

    /**
     * Start dripping culture tidbits now and forever, once per day.
     */
    function startCultureDrip() {
        // Send one culture message every weekday
        setInterval(sendCultureMessageIfWeekday, msPerDay);
        // And send one right now.
        sendCultureMessageIfWeekday();
    }

    // Send one culture message whenever requested
    robot.respond(/culture us$/i, function(msg) {
        sendCultureMessage(msg);
    });

    setTimeout(startCultureDrip, msUntilMorning());
};

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

    if (later < now) {
        later.setUTCDate(later.getUTCDate() + 1);
    }

    return Math.abs(later - now);
}

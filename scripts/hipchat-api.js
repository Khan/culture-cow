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
        // an admin-required api lookup each time we call this
        // function.  To update this list, run the following, using
        // the hipchat_deploy_token from webapp's secrets.py.
        //    curl 'api.hipchat.com/v1/rooms/list?auth_token=<deploy_token>' | python -c 'import json, sys; print "".join("                \"%s\": \"%s\",\n" % (r["xmpp_jid"].split("@")[0].split("_", 1)[1].encode("utf-8"), r["name"].encode("utf-8")) for r in json.load(sys.stdin)["rooms"])'
        // Note that if you want Culture Cow to actually *listen* inside
        // a room, you also need to update bin/secrets:HUBOT_HIPCHAT_ROOMS.
        var rooms = {
                "*schwag*": "*Schwag*",
                "1762": "1762",
                "1s_and_0s": "1s and 0s",
                "1s0s_commits": "1s/0s: commits",
                "1s0s_deploys": "1s/0s: deploys",
                "60_minutes_popup_room": "60 minutes popup room",
                "8-minute_workouts": "8-minute workouts",
                "911_responders": "911 responders",
                "a_very_coup_hackaween": "A Very Coup Hackaween!",
                "aletheia-lang": "Aletheia-Lang",
                "south_america": "América do Sul",
                "applied_math": "Applied Math",
                "phoox": "Athena",
                "atlas": "Atlas",
                "boa_convo": "BOA Convo",
                "band_x": "Band X",
                "barbershop_n-tet": "Barbershop n-tet",
                "bentest": "BenTest",
                "team_who_needs_a_new_name": "Brand Builders",
                "cafeteria": "Cafeteria",
                "caltrainers": "Caltrainers",
                "canada": "Canada",
                "classy_coaches": "Classy coaches",
                "climbing": "Climbing",
                "college_admissions": "College Admissions",
                "community_-_support": "Community: Support",
                "cs": "Computer science",
                "content_reorg": "Content",
                "content_creators_and_partners": "Content creators and partners",
                "exercise_internals": "Content tools",
                "continuous_integration": "Continuous Integration",
                "convex_optimization_and_ml_reading_group": "Convex Optimization and ML Reading Group",
                "crittenden": "Crittenden",
                "ddddddd": "D&D&D&D&D&D&D",
                "analytics": "Data Science",
                "data_science_plot_of_the_day": "Data Science Plot Of The Day",
                "diversity": "Diversity",
                "dunk_academy": "Dunk Academy",
                "et_phone_home": "ET Phone Home",
                "early_math!": "Early Math!",
                "east_bay_riders_club": "East Bay Riders Club",
                "edp": "EdP",
                "email_client_heaven": "Email heaven",
                "end_of_year_campaign": "End of Year Campaign",
                "epistemology": "Epistemology!",
                "exercises": "Exercises",
                "fixit_the_subtitling_community._they_need_us.": "FIXIT the subtitling community. They need us.",
                "facebook_hackathon": "Facebook Hackathon",
                "fakevacations.com": "FakeVacations.com",
                "game-stuff": "Game-Stuff",
                "profiles": "Growth",
                "growth_mindset_intervention": "Growth Mindset Intervention",
                "guardians": "Guardians",
                "hawaii": "HAWAI'I",
                "hack_week": "Hack Week",
                "hack_week_for_all": "Hack Week for All",
                "hackathon_movie_night!": "Hackathon Movie Night!",
                "joshtest": "HipChat Tests",
                "history_brainstorm": "History Brainstorm",
                "humanities": "Humanities",
                "io2014": "IO2014",
                "images_✅___text_❌": "Images ✅  Text ❌",
                "infrastructure": "Infrastructure",
                "internal": "Internal",
                "internet_lint_filter": "Internet lint filter",
                "invertebrate": "Invertebrate",
                "jaceless": "Jaceless",
                "javascript": "JavaScript ",
                "k-12": "K-12",
                "ka_clubbing_o_o": "KA Clubbing O_O",
                "ka_quest_-_healthy_hackathon_3": "KA Quest - Healthy hackathon 3",
                "khan_academy": "Khan Academy",
                "khan_academy_copa_mundial": "Khan Academy Copa Mundial",
                "khan_cyclists": "Khan Cyclists",
                "khan_kickers": "Khan Kickers",
                "khan_runners": "Khan Runners",
                "khanslist": "Khanslist",
                "lazy_bear_team": "Lazy Bear Team",
                "leaderboards": "Leaderboards",
                "learning_science": "Learning Science",
                "mathracer": "Mathracer",
                "mixtape_smackdown": "Mixtape Smackdown",
                "mobile_design!": "Mobile design!",
                "mobile!": "Mobile!",
                "nes_power_glove": "NES Power Glove",
                "not_particles": "NOT Particles",
                "nonprophet_fan_club": "NonProphet fan club",
                "partnerships_and_community": "Partnerships and Community",
                "this_will_be_renamed": "Power Mode: TNG",
                "product_support_volunteers": "Product support volunteers",
                "pl": "Programming Languages",
                "python": "Python",
                "quetzalcoatl": "Quetzalcoatl",
                "referral_urls": "Referral URLs",
                "remote": "Remote",
                "reviewboard_chris": "ReviewBoard: chris",
                "reviewboard_csilvers": "ReviewBoard: csilvers",
                "reviewboard_david": "ReviewBoard: david",
                "sat": "SAT",
                "sf_day_carpool": "SF Day Carpool",
                "strategy_and_programs": "SPro and EdP",
                "san_francisco": "San Francisco",
                "smart_hints": "Smart Hints",
                "smart_history": "Smart History",
                "social_media_group": "Social media",
                "strangeloop": "StrangeLoop",
                "t-swizzle": "T-Swizzle",
                "temp_jquery_upgrade": "TEMP: jquery upgrade",
                "food": "Tea-Rex",
                "teacher_fellows": "Teacher Fellows",
                "teams": "Teams",
                "test": "Test",
                "the_lucky_one": "The Lucky One",
                "the_scary_door": "The Scary Door",
                "top_contributors": "Top Contributors",
                "translations": "Translations",
                "under_amazon_nda": "Under Amazon NDA",
                "video_delivery": "Video delivery",
                "wow_such_dinner": "Wow such dinner",
                "ycla": "YCLA",
                "you_can_learn_anything": "You Can Learn Anything",
                "zzz_backup_decode_error_reporting": "ZZZ_Backup Decode Error Reporting",
                "z_hackathon_dashboarding": "Z_Hackathon Dashboarding",
                "appengine_perf_issues": "appengine perf issues",
                "assessments": "assessments (deprecated)",
                "autoescape_--_hopefully_short-lived_room": "autoescape -- hopefully short-lived room",
                "bakhan": "bakhan",
                "brian_test": "brian_test",
                "mad_yong": "conspicuous room",
                "db.userproperty_killing": "db.UserProperty killing",
                "dd": "dd",
                "demoocow": "demoocow",
                "design_brainstorming": "design brainstorming",
                "design_matters": "design matters",
                "dev_happiness_fixit": "dev happiness fixit",
                "emaillyfe": "emaillyfe",
                "emotikhans": "emotikhans",
                "facetagram": "facetagram",
                "feedback_fridays": "feedback fridays",
                "game_of_thrones": "game of thrones",
                "hackney": "hackney",
                "heyo": "heyo",
                "i18n": "i18n",
                "implementation_domination": "implementation domination",
                "interns": "interns",
                "jamestest": "jamestest",
                "lolcode": "lolcode",
                "map_musings": "map musings",
                "moo_goes_the_cow": "moo goes the cow",
                "notifier_test": "notifier test",
                "platform": "platform",
                "popup_room_--_homepage": "popup room -- homepage",
                "product_power_rangers": "product power rangers",
                "quick_cs_team_chat": "quick CS team chat",
                "quick_cnc_discussion": "quick c'n'c discussion",
                "quick_debug": "quick debug",
                "quick_infrastructure_team_chat": "quick infrastructure team chat",
                "room_of_requirement": "room of requirement",
                "school_visit_coordination": "school visit coordination",
                "search": "search",
                "secret_party": "secret party",
                "semifortnightly_supper": "semifortnightly supper",
                "shortlived": "shortlived",
                "ssrs": "ssrs",
                "super_omar_testing": "super omar testing",
                "tennis": "tennis",
                "tom_test_room": "tom test room",
                "topics": "topics",
                "translation_nation": "translation nation",
                "-_about_these_hipchat_rooms_-": "✈ About these HipChat rooms"
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

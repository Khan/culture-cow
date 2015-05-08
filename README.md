Culture Cow
===========

<a href="http://hubot.github.com/">Hubot</a> configuration for Khan Academy's
Culture Cow

What it means to be Culture Cow
====================

1) Culture Cow provides a steady drip of Khan Academy culture, straight into
HipChat's veins.

2) If at any point Culture Cow acts like an annoying robot by decreasing the
signal:noise ratio in our HipChat rooms, it will be turned into delicious
hamburgers.

Can I add more culture magic?
=============================

Absolutely. Modify scripts/culture.js (or whatever else you want). Just abide
by the two rules of Culture Cow above. And sorry it's JS and not all
cool'n'CoffeeScripty.

Setup instructions
==================

0) Culture Cow gets installed and setup automatically by KA's aws-config/internal-webserver/setup.sh, but if you're doing this manually...

1) Clone repo

2) Install dependencies: ```npm install``` (or [start here](https://github.com/github/hubot/tree/master/docs) if having trouble.)

3) Create bin/secrets as follows:

    #!/bin/bash
    export HUBOT_HIPCHAT_JID="..."
    export HUBOT_HIPCHAT_PASSWORD="..."
    export HUBOT_HIPCHAT_ROOMS_BLACKLIST="6574_zzz_backup_decode_error_reporting,..."
    export HUBOT_HIPCHAT_TOKEN="..."

    export FILE_BRAIN_PATH="..."
    export JENKINS_DEPLOY_TOKEN="<'Authentication Token' from http://jenkins.khanacademy.org/job/deploy-via-multijob/configure>"
    export TRELLO_KEY="..."
    export TRELLO_TOKEN="..."

    export HUBOT_ZENDESK_USER="..."
    export HUBOT_ZENDESK_PASSWORD="..."
    export HUBOT_ZENDESK_SUBDOMAIN="..."

    export HUBOT_WOLFRAM_APPID="..."

    export HUBOT_ASANA_APIKEY="<from https://phabricator.khanacademy.org/K61>"

4) Start the culture cow: ```sudo service culture-cow restart```

Where does Khan Academy's Culture Cow live?
===========================================

toby

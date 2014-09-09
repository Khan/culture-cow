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
   export HUBOT_HIPCHAT_ROOMS="..."
   export HUBOT_HIPCHAT_TOKEN="..."
   export TRELLO_KEY="..."
   export TRELLO_TOKEN="..."

4) Start the culture cow: ```bin/culturecow``` (or ```setsid bin/culturecow```
if you wanna kick off the culture cow on Khan Academy's toby machine and have
it continue running after you disconnect)

Where does Khan Academy's Culture Cow live?
===========================================

toby (internal webserver)

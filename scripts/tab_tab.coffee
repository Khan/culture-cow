# Description:
#   Get a list of all installed script commands
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   tab tab|tt - Get a list of all commands installed 
#
# Author:
#   tzjames

fs   = require 'fs'
path = require 'path'

endswith = (file, suffix) -> file.indexOf(suffix, file.length - suffix.length) isnt -1

module.exports = (robot) ->
	robot.hear /^tab tab|tt$/i, (msg) ->
        if not robot.fromSelf msg
            scriptPath = path.join(".", "scripts")

            files = fs.readdirSync scriptPath

            commands = "Here is a list of commands:\n"
            findCommandIn = (file) ->
                if endswith(file, ".js") or endswith(file, ".coffee")
                    fullPath = path.join(scriptPath, file) 
                    try
                        data = fs.readFileSync fullPath, 'utf-8'
                        if data
                            match = data.match(/Commands:\s*\n(((#|\s\*|\*)[^\S\n]{2}.*\n)*)/m)
                            if match
                                lines = (m.substr(2).trim() for m in match[1].split("\n"))
                                fileCommands = (m for m in lines when m and m isnt "None")
                                if fileCommands.length
                                    commands += file.split(".")[0] + ":\n    " + fileCommands.join("\n     ")+"\n"
                     catch error
                        console.log('Unable to read', file, error) unless error.code is 'ENOENT'

            findCommandIn file for file in files

            robot.fancyMessage({
               msg: commands,
               room: msg.envelope.room,
               from: "Command Colobus",
               message_format: "text"
            });


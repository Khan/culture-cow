# Description:
#   Queries Zendesk for information about support tickets
#
# Configuration:
#   HUBOT_ZENDESK_USER
#   HUBOT_ZENDESK_PASSWORD
#   HUBOT_ZENDESK_SUBDOMAIN
#
# Commands:
#   zendesk  (all) tickets - returns the total count of all unsolved tickets. The 'all' keyword is optional.
#   zendesk  new tickets - returns the count of all new (unassigned) tickets
#   zendesk  open tickets - returns the count of all open tickets
#   zendesk  escalated tickets - returns a count of tickets with escalated tag that are open or pending
#   zendesk  pending tickets - returns a count of tickets that are pending
#   zendesk  list (all) tickets - returns a list of all unsolved tickets. The 'all' keyword is optional.
#   zendesk  list new tickets - returns a list of all new tickets
#   zendesk  list open tickets - returns a list of all open tickets
#   zendesk  list pending tickets - returns a list of pending tickets
#   zendesk  list escalated tickets - returns a list of escalated tickets
#   zendesk  ticket <ID> - returns information about the specified ticket
#
# Author:
#   Jay Wallace
sys = require 'sys' # Used for debugging
tickets_url = "https://#{process.env.HUBOT_ZENDESK_SUBDOMAIN}.zendesk.com/tickets"
queries =
  unsolved: "search.json?query=status<solved+type:ticket&sort_by=updated_at&sort_order=desc"
  open: "search.json?query=status:open+type:ticket&sort_by=updated_at&sort_order=desc"
  new: "search.json?query=status:new+type:ticket&sort_by=updated_at&sort_order=desc"
  escalated: "search.json?query=tags:escalated+status:open+status:pending+type:ticket&sort_by=updated_at&sort_order=desc"
  pending: "search.json?query=status:pending+type:ticket&sort_by=updated_at&sort_order=desc"
  tickets: "tickets"
  users: "users"


zendesk_request = (msg, url, handler) ->
  zendesk_user = "#{process.env.HUBOT_ZENDESK_USER}"
  zendesk_password = "#{process.env.HUBOT_ZENDESK_PASSWORD}"
  auth = new Buffer("#{zendesk_user}:#{zendesk_password}").toString('base64')
  zendesk_url = "https://#{process.env.HUBOT_ZENDESK_SUBDOMAIN}.zendesk.com/api/v2"

  msg.http("#{zendesk_url}/#{url}")
    .headers(Authorization: "Basic #{auth}", Accept: "application/json")
      .get() (err, res, body) ->
        if err
          send msg, "Zendesk says: #{err}"
          return

        content = JSON.parse(body)

        if content.error?
          if content.error?.title
            send msg, "Zendesk says: #{content.error.title}"
          else
            send msg, "Zendesk says: #{content.error}"
          return

        handler content

# FIXME this works about as well as a brick floats
zendesk_user = (msg, user_id) ->
  zendesk_request msg, "#{queries.users}/#{user_id}.json", (result) ->
    if result.error
      send msg, result.description
      return
    result.user

sendList = (msg, results, escalated=false) ->
    escalatedText = if escalated then "escalated and " else "" 
    # Hipchat 502's with too many results, lets just show the latest 40
    # Their api says 10k is the maximum number of characters but in practice 
    # it seems about half that amount.  We also send it in html format because
    # hipchat only autolinks the first 10 or so links.
    text = ("Ticket #{result.id} is " + escalatedText + "#{result.status}:" +
        " <a href='#{tickets_url}/#{result.id}'>#{tickets_url}/#{result.id}" +
        "</a>" for result in results.results.splice(0,40))
    text = text.join("<br/>")
    send msg, text, "html"


send = (msg, text, format="text") ->
    msg.robot.fancyMessage({
        msg: text,
        room: msg.envelope.room,
        from: "Zendesk Zombie",
        message_format: format
    }); 

module.exports = (robot) ->

  robot.hear /zendesk (all )?tickets$/i, (msg) ->
    zendesk_request msg, queries.unsolved, (results) ->
      ticket_count = results.count
      send msg, "#{ticket_count} unsolved tickets"

  robot.hear /zendesk pending tickets$/i, (msg) ->
    zendesk_request msg, queries.pending, (results) ->
      ticket_count = results.count
      send msg, "#{ticket_count} unsolved tickets"

  robot.hear /zendesk new tickets$/i, (msg) ->
    zendesk_request msg, queries.new, (results) ->
      ticket_count = results.count
      send msg, "#{ticket_count} new tickets"

  robot.hear /zendesk escalated tickets$/i, (msg) ->
    zendesk_request msg, queries.escalated, (results) ->
      ticket_count = results.count
      send msg, "#{ticket_count} escalated tickets"

  robot.hear /zendesk open tickets$/i, (msg) ->
    zendesk_request msg, queries.open, (results) ->
      ticket_count = results.count
      send msg, "#{ticket_count} open tickets"

  robot.hear /zendesk list (all )?tickets$/i, (msg) ->
    zendesk_request msg, queries.unsolved, (results) ->
      sendList(msg, results)

  robot.hear /zendesk list new tickets$/i, (msg) ->
    zendesk_request msg, queries.new, (results) ->
      sendList(msg, results)

  robot.hear /zendesk list pending tickets$/i, (msg) ->
    zendesk_request msg, queries.pending, (results) ->
      sendList(msg, results)

  robot.hear /zendesk list escalated tickets$/i, (msg) ->
    zendesk_request msg, queries.escalated, (results) ->
      sendList(msg, results)

  robot.hear /zendesk list open tickets$/i, (msg) ->
    zendesk_request msg, queries.open, (results) ->
      sendList(msg, results)

  robot.hear /zendesk ticket ([\d]+)$/i, (msg) ->
    ticket_id = msg.match[1]
    zendesk_request msg, "#{queries.tickets}/#{ticket_id}.json", (result) ->
      if result.error
        send msg, result.description
        return
      message = "#{tickets_url}/#{result.ticket.id} ##{result.ticket.id} (#{result.ticket.status.toUpperCase()})"
      message += "\nUpdated: #{result.ticket.updated_at}"
      message += "\nAdded: #{result.ticket.created_at}"
      message += "\nDescription:\n-------\n#{result.ticket.description}\n--------"
      send msg, message

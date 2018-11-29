/******************************
  Variables & Libs
*******************************/

var config = require('./config');
var mysql = require('promise-mysql');
var connection = mysql.createConnection(config.mysqlConfig);

const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();

let l2lraids = {
  'Levi': [],
  'EoW': [],
  'SoS': [],
  'Wish': []
};

const helpTxt = {
  name: 'Commands',
  value: '```' +
  'Subscribe - !L2L levi/eow/sos/wish comments' +
  '\nUnsubscribe - !L2L levi/eow/sos/wish unsub' +
  '\nShow list - !L2L' +
  '```'
}

const adminTxt = {
  name: 'Admin Commands',
  value: '```' +
  'Sub. User - !L2L levi add Username' +
  '\nUnsub. User - !L2L levi remove Username' +
  '\nUnsub. all users from a raid - !L2L levi remove *' +
  '```'
}

let isAdmin = false;

// Channels
const channelCategoryName = "Looking for group";
const channelName = "looking_2_learn_raid"; // no spaces all lower case
const eventChannelName = "raid_events"; // no spaces all lower case
let channelID;
let eventChannelID;
let channel;
let eventChannel;
let serverID; // also known as guild id

/******************************
  Event Listeners
*******************************/

client.on("ready", () => {
  console.log("I am ready!");
});

client.on('messageReactionAdd', (reaction, user) => {

  serverID = reaction.message.guild.id;

  channelCheck(reaction.message.guild);

    if( reaction.message.channel.name != eventChannelName ) return;

    message = reaction.message;
    eventName = message.embeds[0].message.embeds[0].title ? message.embeds[0].message.embeds[0].title : "";

    if( eventName ) {
      eventID = eventName.split("Event ID: ")[1] ? eventName.split("Event ID: ")[1] : 0;

      if( eventID ) {
        if(reaction.emoji.name === "🆗") {
          joinEvent(eventID, user, "confirmed");
        }

        if(reaction.emoji.name === "🤔") {
          joinEvent(eventID, user, "reserve");
        }

        if(reaction.emoji.name === "⛔") {
          unSubEvent(eventID, user);
        }
      }
    }
});

client.on("message", (message) => {

  if ( message.author.bot ) return;

  if ( message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") )
    isAdmin = true;

  serverID = message.guild.id;

  channelCheck(message.guild);

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if ( command.toLowerCase() === "l2l" ) {

    switch ( args[0] ) {

      /***************************
            Event Commands
      ****************************
      -> create event_name event_description
      -> delete event_id
      -> edit event_id event_name event_description
      **************************/

      case "event":
        switch ( args[1] ) {
          // !l2l event create "Levi Raid 20 Feb 9PM" "Bring raid banners!"
          case "create":
            if ( args.length > 2 ) {

              let recompose = args.slice(2, args.length).join(" ");
              let indices = []; // find the indices of the quotation marks

              for (var i in recompose) {
                  let char = recompose[i];
                if (char === '"') {
                  indices.push(i);
                }
              }

              let eventName;
              let eventDescription = '';

              if (indices.length == 0) {
                eventName = args.slice(2, args.length).join(" ");
              }
              else if(indices.length == 2) {
                eventName = recompose.substring(indices[0] + 1, indices[1]);
                let nameLength = parseInt(indices[1]) + 1;
                if ( recompose.length > nameLength ) {
                  eventDescription = recompose.substring(nameLength+1);
                }
              }
              else if(indices.length == 4) {
                eventName = recompose.substring(indices[0] + 1, indices[1]);
                eventDescription = recompose.substring(parseInt(indices[2]) + 1, indices[3]);
              }
              else {
                eventName = args[2];
              }

              createEvent(message.author, eventName, eventDescription);
            }

            break;

          // !l2l event delete eventID
          // Only can delete if event is created by message author or user is admin
          case "delete":
            if ( args.length > 2 ) {
              let eventID = args[2];
              deleteEvent(eventID, message.author);
            }
            break;

          case "edit":
            if ( args.length > 3 ) {
              eventID = args[2];

              if ( eventID ) {
                let recompose = args.slice(3, args.length).join(" ");
                let indices = []; // find the indices of the quotation marks

                for (var i in recompose) {
                    let char = recompose[i];
                  if (char === '"') {
                    indices.push(i);
                  }
                }

                let eventName;
                let eventDescription = '';

                if (indices.length == 0) {
                  eventName = args.slice(3, args.length).join(" ");
                }
                else if(indices.length == 2) {
                  eventName = recompose.substring(indices[0] + 1, indices[1]);
                  let nameLength = parseInt(indices[1]) + 1;
                  if ( recompose.length > nameLength ) {
                    eventDescription = recompose.substring(nameLength+1);
                  }
                }
                else if(indices.length == 4) {
                  eventName = recompose.substring(indices[0] + 1, indices[1]);
                  eventDescription = recompose.substring(parseInt(indices[2]) + 1, indices[3]);
                }
                else {
                  eventName = args[2];
                }

                updateEvent(message.author, eventID, eventName, eventDescription);
              }
            }
            break;

          default:
            clear(eventChannel);
            getEvents();
        }

        break;

      case undefined:
      case null:
      case "":
      case 'show':
        getInterestList(message);
        break;

      case 'clear':
        if ( isAdmin ) {
          clear(channel);
          getInterestList();
        }
        break;

      // Interest list subscribe / unsubscribe
      default:
        let raidInterested = smartInputDetect( args[0] );
        let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

        for ( var raidName in l2lraids ) {
          if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
            switch ( args[1] ) {
              /********************************
                      Mods Only Commands
              ********************************/
              case "remove":
                if( args[2] && isAdmin === true ) {
                  if( args[2] === '*' )
                    unSubAll(raidName, message);
                  else {
                    let user = message.mentions.users.first();

                    if( user ) {
                      unSub(raidName, user, message);
                    }
                  }
                }
                break;

              case "add":
                if( args[2] && isAdmin === true ) {
                  let user = message.mentions.users.first();

                  if( user ) {
                    let remarks = args[3] ? args.slice(3, args.length).join(" ") : "";
                    sub(raidName, user, remarks, message);
                  }
                }
                break;

              /********************************
                  Interest List Sub / Unsub
              ********************************/
              case "unsub":
                unSub(raidName, message.author, message);
                break;
              default:
                sub(raidName, message.author, remarks, message);
            }
          }
        }
      // End default case
    }
  }

  // Delete message after processed
  message.delete();
});

/******************************
  Functions
*******************************/

async function clear(channel) {
    const fetched = await channel.fetchMessages({limit: 99});
    channel.bulkDelete(fetched);
}

function unSubEvent(eventID, player) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id]);
  }).then(function(results){
    clear(eventChannel);
    getEvents();
  });
}

function joinEvent(eventID, player, type) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id]);
  }).then(function(results){
    return connection.query("INSERT into event_signup SET ?", {event_id: eventID, username: player.username, user_id: player.id, type: type, date_added: moment().format('YYYY-M-D H:m:s')});
  }).then(function(results){
    clear(eventChannel);
    getEvents();
  });
}

function getEvents() {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE server_id = ?", [serverID]);
  }).then(function(results){

    var rows = JSON.parse(JSON.stringify(results));

    // For each event
    for(var i = 0; i < rows.length; i++) {

      let event = rows[i];

      mysql.createConnection(config.mysqlConfig).then(function(c){
        return c.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id]);
      }).then(function(results){
        var signupsRows = JSON.parse(JSON.stringify(results));
        var confirmed = "";
        var confirmedCount = 1;
        var reserve = "";
        var reserveCount = 1;

        for(var i = 0; i < signupsRows.length; i++) {
          if( signupsRows[i].type == 'confirmed' ) {
            confirmed += confirmedCount + ". " + signupsRows[i].username + "\n";
            confirmedCount++;
          }
          else {
            reserve += reserveCount + ". " + signupsRows[i].username + "\n";
            reserveCount++;
          }
        }

        if ( confirmed === "" ) confirmed = "nil";
        if ( reserve === "" ) reserve = "nil";

        // Event signups - Yes / Reserve
        var richEmbed = new Discord.RichEmbed()
          .setTitle( event.event_name + " | Event ID: " + event.event_id )
          .setColor("#DB9834")
          .setDescription( event.event_description );

        richEmbed.addField("Confirmed", confirmed, true);
        richEmbed.addField("Reserve", reserve, true);
        eventChannel.send( richEmbed );
      });
    }
    return;
  }).then(function(){
      var richEmbed = new Discord.RichEmbed()
        .setTitle("Instructions")
        .setColor("#DB9834")
        .setDescription(":ok: to confirm :thinking: to reserve :no_entry: to remove");

      richEmbed.addField("Commands", "!l2l event help", true);

    eventChannel.send( richEmbed );
  });
}

function deleteEvent(eventID, player) {

  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE event_id = ?", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if ( rows[0] ) {
      event = rows[0];
    }

    if ( isAdmin || event.created_by == player.id ) {
      return connection.query("DELETE FROM event WHERE event_id = ?", [eventID]);
    }

    connection.end();
  }).then(function(){
    clear(eventChannel);
    getEvents();
  });
}

function updateEvent(player, eventID, eventName, eventDescription) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE event_id = ?", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if ( rows[0] ) {
      event = rows[0];
    }

    if ( isAdmin || event.created_by == player.id ) {
      return connection.query("UPDATE event SET event_name = ?, event_description = ? WHERE event_id = ?", [eventName, eventDescription, eventID]);
    }

    connection.end();
  }).then(function(){
    clear(eventChannel);
    getEvents();
  });
}

function createEvent(player, eventName, eventDescription) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    return conn.query("INSERT into event SET ?",
      { server_id: serverID,
        event_name: eventName,
        event_description: eventDescription,
        created_by: player.id,
        date_added: moment().format('YYYY-M-D')
      });
  }).then(function(result){
    clear(eventChannel);
    getEvents();
  });
}

function channelCheck(guild) {
  let channelCategoryExists = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category");
  let channelCategoryID;

  if( channelCategoryExists === null )
    guild.createChannel(channelCategoryName, "category").then(function(newChannel){
      channelCategoryID = newChannel.id;
    });
  else
    channelCategoryID = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category").id;

  let channelExists = guild.channels.find(channel => channel.name == channelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( channelExists === null )
    guild.createChannel(channelName, "text").then(function(newChannel){
      newChannel.setParent( channelCategoryID );
      channelID = newChannel.id;
      channel = client.channels.get(channelID);
    });
  else {
    channelID = guild.channels.find(channel => channel.name == channelName && channel.type == "text" && channel.parentID == channelCategoryID).id;
    channel = client.channels.get(channelID);
  }

  let eventChannelExists = guild.channels.find(channel => channel.name == eventChannelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( eventChannelExists === null )
    guild.createChannel(eventChannelName, "text").then(function(newChannel){
      newChannel.setParent( channelCategoryID );
      eventChannelID = newChannel.id;
      eventChannel = client.channels.get(eventChannelID);
    });
  else {
    eventChannelID = guild.channels.find(channel => channel.name == eventChannelName && channel.type == "text" && channel.parentID == channelCategoryID).id;
    eventChannel = client.channels.get(eventChannelID);
  }
}

function sub(raid, player, comment, message) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("DELETE FROM interest_list where raid = ? AND username = ? AND user_id = ? AND server_id = ?", [raid, player.username, , player.id, message.guild.id]);
  }).then(function(results){
    return connection.query("INSERT into interest_list SET ?", {raid: raid, username: player.username, user_id: player.id, comment: comment, server_id: message.guild.id, date_added: moment().format('YYYY-M-D')});
  }).then(function(results){
    getInterestList();
  });
}

function unSub(raid, player, message) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    return conn.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id]);
  }).then(function(results){
    getInterestList();
  });
}

function unSubAll(raid, message) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    return conn.query("DELETE FROM interest_list where raid = ? AND server_id = ?", [raid, message.guild.id]);
  }).then(function(results){
    getInterestList();
  });
}

function getInterestList() {

  mysql.createConnection(config.mysqlConfig).then(function(conn){
    l2lraids = {
      'Levi': [],
      'EoW': [],
      'SoS': [],
      'Wish': []
    };

    return conn.query("SELECT * FROM interest_list WHERE server_id = ?", [serverID]);
  }).then(function(results){

    var rows = JSON.parse(JSON.stringify(results));

    for(var i = 0; i < rows.length; i++) {
      l2lraids[ rows[i]['raid'] ][ rows[i]['username'] ] = rows[i]['comment'] ? rows[i]['comment'] : "";
    }

    return l2lraids;
  })
  .then(function(l2lraids){

    var fields = [];

    let richEmbed = new Discord.RichEmbed()
      .setTitle("Looking 2 learn interest list")
      .setColor("#DB9834")
      .setDescription("");

    // Anybody in interest list?
    for ( var raid in l2lraids ) {
      if ( Object.keys(l2lraids[raid]).length > 0 ) {
        interest = true;
        // Display if # of ppl interested in raid is > 0
        fields.push({
          name: config.raidNameMapping[raid] + " ("+Object.keys(l2lraids[raid]).length+")",
          value: '```yaml\n' + printUsernameRemarks( l2lraids[raid] ) + '```'
        });

        richEmbed.addField(config.raidNameMapping[raid] + " ("+Object.keys(l2lraids[raid]).length+")", '```yaml\n' + printUsernameRemarks( l2lraids[raid] ) + '```', true);
      }
    }

    // Instructions fields
    fields.push(helpTxt)

    richEmbed.addField(helpTxt.name, helpTxt.value);

    embed = {
      embed: {
        color: 3447003,
        title: "Looking 2 learn interest list",
        description: "",
        fields: fields,
      }
    };

    clear(channel);
    channel.send( richEmbed );
  });
}

function getHelpText(message) {
  // Instructions fields
  var fields = [];
  fields.push(helpTxt)

  // Additional instructions for admins
  if ( message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") ) {
    fields.push(adminTxt);
  }

  embed = {
    embed: {
      color: 3447003,
      description: "",
      fields: fields,
    }
  };

  channel.send( embed );
}

function printUsernameRemarks( raid ) {
  var txt = '';

  for ( name in raid ) {
    txt += name;
    txt += raid[name] ? " - "+raid[name]+"" : "";
    txt += "\n";
  }

  return txt;
}

function smartInputDetect(raidName) {

  var leviMatches = ['levi', 'lev', 'leviathan'];
  var eowMatches = ['eow', 'eater'];
  var sosMatches = ['sos', 'spires', 'stars'];
  var wishMatches = ['wish', 'last', 'riven'];

  if( leviMatches.includes(raidName.toLowerCase()) )
    return 'Levi'
  else if( eowMatches.includes(raidName.toLowerCase()) )
    return 'EoW'
  else if( sosMatches.includes(raidName.toLowerCase()) )
    return 'SoS'
  else if( wishMatches.includes(raidName.toLowerCase()) )
    return 'Wish'
  else return 'dadaffsdfsdgsdg';
}

client.login(config.token);
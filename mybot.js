/******************************
  Variables & Libs
*******************************/

var config = require('./config');
var mysql = require('promise-mysql');
var connection = mysql.createConnection(config.mysqlConfig);

setInterval(function () {
    connection.query('SELECT 1');
}, 5000);

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
  'Subscribe - !l2l levi/eow/sos/wish comments' +
  '\nUnsubscribe - !l2l levi/eow/sos/wish unsub' +
  '```'
}

const eventHelpTxt =
  '```' +
  'L2L Bot Event Commands\n------------------------\n' +
  'Enter the commands in discord channel and NOT here.\n\n' +
  'Create: !L2L event create "event name goes here" "event description goes here"\n' +
  'e.g. !L2L event create "Last Wish 31 Dec 8PM" "Speed run"\n\n' +

  'Delete: !L2L event delete event_id OR react with ❌ on the event\n' +
  'e.g. !L2L event delete 5\n\n' +
  'Warning: deletion is irreversible\n\n' +

  'Edit: !L2L event edit event_id "event name goes here" "event description goes here"\n' +
  'e.g. !L2L event edit 5 "Last Wish 31 Dec 8PM" "Petra run"\n\n' +

  'Add/Edit Comment: !L2L event comment event_id "comment"\n' +
  'e.g. !L2L event comment 5 "First timer here!"\n\n' +

  'Add player to event: !L2L event add event_id @player\n' +
  'e.g. !L2L event add 5 @player\n' +
  'e.g. !L2L event add 5 @player reserve\n\n' +

  'Remove player from event: !L2L event remove event_id @player\n' +
  'e.g. !L2L event remove 5 @player\n\n' +

  'Notify: React with 👋 on the event to ping all users that are signed up\n' +
  '```';

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
const channelName = "raid_learning_interest_list"; // no spaces all lower case
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
  updateAllServers();
});

client.on('messageReactionAdd', (reaction, user) => {

  if ( reaction.message.guild === null ) return; // Disallow DM
  if ( user.bot ) return;

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

        if(reaction.emoji.name === "❌") {
          deleteEvent(eventID, user);
        }

        if(reaction.emoji.name === "👋") {
          pingEventSignups(eventID);
        }
      }
    }
});

client.on("message", (message) => {

  if ( message.author.bot ) return;
  if ( message.guild === null ) return; // Disallow DM

  isAdmin = (message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") || message.member.id == "198636356623269888") ? true : false;

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

          // Restricted to message author or admin
          case "delete":
            if ( args.length > 2 ) {
              let eventID = args[2];
              deleteEvent(eventID, message.author);
            }

            break;

          // Restricted to message author or admin
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

          // Add users to events !l2l event add event_id @user confirmed|reserve
          case "add":
            if ( args.length > 2 ) {
              let eventID = args[2];
              let player = message.mentions.users.first();
              let type = args[4] ? args[4] : "";
              type = (type == "reserve") ? "reserve" : "confirmed";

              if( eventID && player ) {
                add2Event(eventID, type, message.author, player);
              }
            }

            break;

          // Add users to events !l2l event remove event_id @user
          case "remove":
            if ( args.length > 2 ) {
              let eventID = args[2];
              let player = message.mentions.users.first();

              if( eventID && player ) {
                removeFromEvent(eventID, message.author, player);
              }
            }

            break;

          // Add users to add comments to sign up
          // !l2l event comment 5 Petra's run maybe?
          case "comment":
            if ( args.length > 2 ) {
              let eventID = args[2];
              let player = message.author;
              let comment =  args.slice(3, args.length).join(" ") ? args.slice(3, args.length).join(" ") : "";

              if( eventID ) {
                updateEventAddComment( eventID, player, comment );
              }
            }

            break;

          // Alternative command to sign up
          case "sub":
            if ( args.length > 2 ) {
              let eventID = args[2];
              joinEvent(eventID, message.author, "confirmed");
            }

            break;

          // Alternative command to unsub
          case "unsub":
            if ( args.length > 2 ) {
              let eventID = args[2];
              unSubEvent(eventID, message.author);
            }

            break;

          case "help":
            message.author.send(eventHelpTxt);
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
          clear(eventChannel);
          getInterestList();
          getEvents();
        }
        break;

      /***************************
            Interest List Commands
      ****************************
      -> raid_name comment | e.g. !l2l levi free after 10
      -> raid_name unsub | e.g. !l2l levi unsub
      -> raid_name add user_name comment | !l2l levi add xenodus noob
      -> raid_name unsub user_name | !l2l levi unsub xenodus
      **************************/

      default:
        let raidInterested = smartInputDetect( args[0] );
        let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

        for ( var raidName in l2lraids ) {
          if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
            switch ( args[1] ) {
              /********************************
                          Mods Only
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

  // Delete message after processed to keep channels clean
  if ( message.channel === eventChannel || message.channel === channel )
    message.delete();
});

/******************************
  Functions
*******************************/

function clear(channel, limit = 100) {
  return channel.fetchMessages({limit}).then(collected => {
    if (collected.size > 0) {
      channel.bulkDelete(collected, true);
    }
  });
}

/*
async function clear(channel) {
  try{
    const fetched = await channel.fetchMessages({limit: 99});
    channel.bulkDelete(fetched);
  }
  catch(e) {
    return;
  }
}
*/

function updateAllServers() {
  for( var guild of client.guilds.values() ) {
    serverID = guild.id;
    channelCheck(guild);
    clear(channel);
    clear(eventChannel);
    getInterestList();
    getEvents();
  }
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

function removeFromEvent(eventID, user, player) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE event_id = ? ", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      unSubEvent(eventID, player);
    }

    return;
  });
}

function updateEventAddComment(eventID, user, comment) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("UPDATE event_signup SET comment = ? WHERE event_id = ? AND user_id = ?", [comment, eventID, user.id]);
  }).then(function(results){
    clear(eventChannel);
    getEvents();
  });
}

function add2Event(eventID, type, user, player) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE event_id = ? ", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      joinEvent(eventID, player, type, user);
    }

    return;
  });
}

function joinEvent(eventID, player, type, addedByUser) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id]);
  }).then(function(results){
    if ( addedByUser )
      return connection.query("INSERT into event_signup SET ?", {event_id: eventID, username: player.username, user_id: player.id, type: type, added_by_user_id: addedByUser.id, added_by_username: addedByUser.username, date_added: moment().format('YYYY-M-D H:m:s')});
    else
      return connection.query("INSERT into event_signup SET ?", {event_id: eventID, username: player.username, user_id: player.id, type: type, date_added: moment().format('YYYY-M-D H:m:s')});
  }).then(function(results){
    clear(eventChannel);
    getEvents();
    signupAlert(eventID, player, type);
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
            confirmed += confirmedCount + ". " + signupsRows[i].username + ( signupsRows[i].comment ? ("\n- _" + signupsRows[i].comment + "_"):"" ) + "\n";
            confirmedCount++;
          }
          else {
            reserve += reserveCount + ". " + signupsRows[i].username + ( signupsRows[i].comment ? ("\n- _" + signupsRows[i].comment + "_"):"" ) +"\n";
            reserveCount++;
          }
        }

        if ( confirmed === "" ) confirmed = "nil";
        if ( reserve === "" ) reserve = "nil";

        var author = client.fetchUser(event.created_by).then(function(author){

          // "Event ID" string used in detection of reaction
          var richEmbed = new Discord.RichEmbed()
            .setTitle( event.event_name + " | Event ID: " + event.event_id )
            .setColor("#DB9834")
            .setDescription( event.event_description );

          richEmbed.addField("Confirmed", confirmed, true);
          richEmbed.addField("Reserve", reserve, true);
          eventChannel.send( richEmbed ).then(async function(message){
            await message.react('🆗');
            await message.react('🤔');
            await message.react('⛔');
            return;
          });
        });
      });
    }
    return;
  }).then(function(){
      var richEmbed = new Discord.RichEmbed()
        .setTitle("Instructions")
        .setColor("#DB9834")
        .setDescription("Sign up to raids by reacting :ok: to __confirm__ :thinking: to __reserve__ :no_entry: to __remove__ (self)");

      richEmbed.addField("Quick Commands", 'Full command list: !l2l event help\nCreate event: !l2l event create "event_name" "event description"\nAdd comment: !l2l event comment event_id "comment"', true);

    eventChannel.send( richEmbed );
  });
}

function signupAlert(eventID, signup, type) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event WHERE event_id = ?", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by ) {
      let event_name = rows[0].event_name;
      let creator_id = rows[0].created_by;

      client.fetchUser(creator_id).then(function(creator){
        creator.send(signup.username + " has signed up for your event, __" + event_name + "__ as " + type + ".");
      });
    }
  });
}

function pingEventSignups(eventID) {
  mysql.createConnection(config.mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("SELECT * FROM event_signup LEFT JOIN event ON event_signup.event_id = event.event_id WHERE event_signup.event_id = ?", [eventID]);
  }).then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    // For each sign up users
    for(var i = 0; i < rows.length; i++) {
      if( rows[i].created_by && rows[i].user_id ) {
        let creator_id = rows[i].created_by;
        let signup_id = rows[i].user_id;
        let event_name = rows[i].event_name;

        client.fetchUser(creator_id).then(function(creator){
          return creator;
        }).then(function(creator){
          client.fetchUser(signup_id).then(function(signup){
            signup.send("This is an alert by " + creator + " or an admin regarding event, __" + event_name + "__");
          });
        });
      }
    }
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
      .setTitle("Teaching Raid LFG")
      .setColor("#DB9834")
      .setDescription("Subscribe to let mods / sherpas know when and what raids you're interested to learn.");

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
        title: "Teaching Raid LFG",
        description: "Subscribe to let mods / sherpas know when and what raids you're interested to learn.",
        fields: fields,
      }
    };

    clear(channel);
    channel.send( richEmbed );
  });
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
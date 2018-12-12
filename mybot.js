/******************************
  Variables & Libs
*******************************/

const config = require('./config').production;
const mysql = require('promise-mysql');
const pool = config.getPool();

const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();

let raids = {
  'Levi': [],
  'EoW': [],
  'SoS': [],
  'Wish': [],
  'Scourge': []
};

const helpTxt = {
  name: 'Commands',
  value:   '```' +
  'Subscribe - !sub levi/eow/sos/wish/scourge comments\n' +
  'Unsubscribe - !unsub levi/eow/sos/wish/scourge\n\n' +
  'Admin/Mods only\n' +
  '-----------------------\n' +
  'Add - !add levi/eow/sos/wish/scourge @user\n' +
  'Remove - !remove levi/eow/sos/wish/scourge @user\n' +
  'Ping - !ping levi/eow/sos/wish/scourge message\n' +
  '```'
}

const eventHelpTxt =
  '```' +
  'SG-E Bot Event Commands\n------------------------\n' +
  'Enter the commands in discord channel and NOT here.\n\n' +
  'Create: !event create "event name goes here" "event description goes here"\n' +
  'e.g. !event create "31 Dec 8PM Last Wish Speedrun" "min 550 and bring whisper"\n\n' +

  'Delete: !event delete event_id OR react with ❌ on the event\n' +
  'e.g. !event delete 5\n\n' +

  'Edit: !event edit event_id "event name goes here" "event description goes here"\n' +
  'e.g. !event edit 5 "31 Dec 8PM Last Wish Speedrun" "min 550 and bring whisper"\n\n' +

  'Notify: React with 👋 on the event to ping all users that are signed up\n\n' +

  'Add/Edit Comment: !event comment event_id "comment"\n' +
  'e.g. !event comment 5 "First timer here!"\n\n' +

  '** Add player to event: !event add event_id @player\n' +
  'e.g. !event add 5 @player\n' +
  'e.g. !event add 5 @player reserve\n\n' +

  '** Remove player from event: !event remove event_id @player\n' +
  'e.g. !event remove 5 @player\n\n' +

  '** Only applicable for admins, mods and event creator' +
  '```';

let isAdmin = false;

// Channels
const channelCategoryName = "Looking for Group";
const channelName = "raid_newbies_signup"; // no spaces all lower case
const eventChannelName = "raid_lfg"; // no spaces all lower case
let channelID;
let eventChannelID;
let channel;
let eventChannel;
let serverID; // also known as guild id

/******************************
  Event Listeners
*******************************/

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.on("debug", (e) => console.info(e));

client.on("ready", () => {
  console.log("I am ready!");
  updateAllServers();
});

client.on("guildCreate", guild => {
    console.log("Joined a new guild: " + guild.name);
    serverID = guild.id;
    channelCheck(guild);
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
          reaction.message.guild.fetchMember(user).then(function(guildMember){
            player = guildMember.nickname ? guildMember : guildMember.user;
            joinEvent(eventID, player, "confirmed", guildMember);
          });
        }

        if(reaction.emoji.name === "🤔") {
          reaction.message.guild.fetchMember(user).then(function(guildMember){
            player = guildMember.nickname ? guildMember : guildMember.user;
            joinEvent(eventID, player, "reserve", guildMember);
          });
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
  if ( message.channel.name != eventChannel.name && message.channel.name != channel.name ) return;
  if ( message.guild === null ) return; // Disallow DM

  console.log( "Message: " + message.content + "\nBy: " + message.author.username );

  isAdmin = (message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") || message.member.id == "198636356623269888" || message.member.id == "154572358051430400") ? true : false;
  serverID = message.guild.id;

  channelCheck(message.guild);

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  /****************************
      raid_lfg channel

      -> !event create "event name" "event description" | e.g. !event create "Levi 8 Dec 9PM" "Bring banners"
      -> !event remove event_id | e.g. !event remove 5
      -> !event edit event_id "event name" "event description" | !event edit 5 "Levi 8 Dec 9PM" "Bring MORE banners"
      -> !event add event_id @user confirmed|reserve | !event add 5 @xenodus
      -> !event remove event_id @user | !event remove 5 @xenodus
  *****************************/

  if ( command.toLowerCase() === "event" ) {

    switch ( args[0] ) {

      // !event create "Levi Raid 20 Feb 9PM" "Bring raid banners!"
      case "create":
        if ( args.length > 1 ) {

          let recompose = args.slice(1, args.length).join(" ");
          let indices = []; // find the indices of the quotation marks

          for (var i in recompose) {
              let char = recompose[i];
            if (char === '"') {
              indices.push(i);
            }
          }

          let eventDescription = '';

          if (indices.length == 0) {
            eventName = args.slice(1, args.length).join(" ");
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
            eventName = args[1];
          }

          createEvent(message.author, eventName, eventDescription);
        }

        break;

      // Restricted to message author or admin
      // !event delete event_id
      case "delete":
        if ( args.length > 1 ) {
          let eventID = args[1];
          deleteEvent(eventID, message.author);
        }

        break;

      // Restricted to message author or admin
      // !event edit event_id "event_name" "event_description"
      case "edit":
        if ( args.length > 1 ) {
          eventID = args[1];

          if ( eventID ) {
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

            updateEvent(message.author, eventID, eventName, eventDescription);
          }
        }
        break;

      // Add users to events !event add event_id @user confirmed|reserve
      case "add":
        if ( args.length > 1 && message.mentions.users.first() ) {
          let eventID = args[1];
          let player = message.mentions.users.first();
          let type = args[3] ? args[3] : "";
          type = (type == "reserve") ? "reserve" : "confirmed";

          if( eventID && player ) {
            add2Event(eventID, type, message.author, player);
          }
        }

        break;

      // Add users to events !event remove event_id @user
      case "remove":
        if ( args.length > 1 && message.mentions.users.first() ) {
          let eventID = args[1];
          let player = message.mentions.users.first();

          if( eventID && player ) {
            removeFromEvent(eventID, message.author, player);
          }
        }

        break;

      // !event comment 5 Petra's run maybe?
      case "comment":
        if ( args.length > 1 ) {
          let eventID = args[1];
          let player = message.author;
          let comment =  args.slice(2, args.length).join(" ") ? args.slice(2, args.length).join(" ") : "";

          if( eventID ) {
            updateEventAddComment( eventID, player, comment, message );
          }
        }

        break;

      // Alternative command to sign up
      // !event sub event_id
      case "sub":
        if ( args.length > 1 ) {
          let eventID = args[1];
          player = message.member.nickname ? message.member : message.author;
          joinEvent(eventID, player, "confirmed");
        }

        break;

      // Alternative command to unsub
      // !event unsub event_id
      case "unsub":
        if ( args.length > 1 ) {
          let eventID = args[1];
          unSubEvent(eventID, message.author);
        }

        break;

      // !event help
      case "help":
        message.author.send(eventHelpTxt);
        break;

      case "clear":
        clear(eventChannel);
        getEvents();
        break;

      default:
        break;
    }
  }

  /****************************
      raid_newbies_signup channel

      -> sub raid_name comment | e.g. !sub levi free after 10
      -> unsub raid_name | e.g. !unsub levi
      -> add raid_name @user_name comment | !add levi @xenodus noob
      -> remove raid_name @user_name | !remove levi @xenodus
  *****************************/

  else if ( command.toLowerCase() === "sub" ) {
    let raidInterested = smartInputDetect( args[0] );
    let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

    for ( var raidName in raids ) {
      if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
        player = message.member.nickname ? message.member : message.author;
        sub(raidName, player, remarks, message);
      }
    }
  }

  else if ( command.toLowerCase() === "unsub" ) {
    let raidInterested = smartInputDetect( args[0] );
    let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

    for ( var raidName in raids ) {
      if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
        unSub(raidName, message.author, message);
      }
    }
  }

  else if ( command.toLowerCase() === "add" ) {
    let raidInterested = smartInputDetect( args[0] );
    let remarks = args[2] ? args.slice(2, args.length).join(" ") : "";

    for ( var raidName in raids ) {
      if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {

        if( args[1] && isAdmin === true ) {
          let user = message.mentions.members.first().nickname ? message.mentions.members.first() : message.mentions.users.first();

          if( user ) {
            sub(raidName, user, remarks, message);
          }
        }
      }
    }
  }

  else if ( command.toLowerCase() === "remove" ) {
    let raidInterested = smartInputDetect( args[0] );

    for ( var raidName in raids ) {
      if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {

        if( args[1] && isAdmin === true ) {
          let user = message.mentions.users.first();

          if( user ) {
            unSub(raidName, user, message);
          }
        }
      }
    }
  }

  else if ( command.toLowerCase() === "ping" ) {
    let raidInterested = smartInputDetect( args[0] );
    let msg = args[1] ? "\nMessage: " + args.slice(1, args.length).join(" ") : "";

    if( isAdmin ) {
      for ( var raidName in raids ) {
        if ( raidInterested.toLowerCase() == raidName.toLowerCase() ) {
          pool.query("SELECT * FROM interest_list WHERE server_id = ? AND raid = ?", [serverID, raidInterested])
          .then(function(results) {
            var rows = JSON.parse(JSON.stringify(results));

            // For each users
            for(var i = 0; i < rows.length; i++) {
              let signup_id = rows[i].user_id;

              client.fetchUser(signup_id).then(function(signup){
                signup.send("This is a ping by " + message.author + " with regards to your interest in learning the raid, " + config.raidNameMapping[raidName] + "." + msg);
              });
            }
          });
          break;
        }
      }
    }
  }

  else if ( command.toLowerCase() === "show" ) {
    getInterestList(message);
  }

  else if ( command.toLowerCase() === "clear" || command.toLowerCase() === "refresh" ) {
    if ( isAdmin ) {
      clear(channel);
      clear(eventChannel);
      getInterestList();
      getEvents();
    }
  }

  // Delete message after processed to keep channels clean
  if ( message.channel === eventChannel || message.channel === channel )
    message.delete();
});

/******************************
  Functions
*******************************/

async function clear(channel) {
  try{
    const fetched = await channel.fetchMessages({limit: 99});
    channel.bulkDelete(fetched);
  }
  catch(e) {
    return;
  }
}

function updateAllServers() {
  for( var guild of client.guilds.values() ) {
    serverID = guild.id;
    channelCheck(guild);

    setTimeout(function () {
      clear(channel);
      clear(eventChannel);
      getInterestList();
      getEvents();
    }, 1000);
  }
}
//

function unSubEvent(eventID, player) {
  pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
  .then(function(results){
    updateEventMessage(eventID);
    return;
  });
}

function removeFromEvent(eventID, user, player) {
  pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      unSubEvent(eventID, player);
    }

    return;
  });
}

function updateEventAddComment(eventID, user, comment) {
  pool.query("UPDATE event_signup SET comment = ? WHERE event_id = ? AND user_id = ?", [comment, eventID, user.id])
  .then(function(results){
    updateEventMessage(eventID);
  });
}

function add2Event(eventID, type, user, player) {
  pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      joinEvent(eventID, player, type, user);
    }

    return;
  });
}

function joinEvent(eventID, player, type, addedByUser) {
  pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
  .then(function(results){
    username = player.nickname ? player.nickname : player.username;

    if ( addedByUser ) {
      addedByUserName = addedByUser.nickname ? addedByUser.nickname : addedByUser.username;
      return pool.query("INSERT into event_signup SET ?", {event_id: eventID, username: username, user_id: player.id, type: type, added_by_user_id: addedByUser.id, added_by_username: addedByUserName, date_added: moment().format('YYYY-M-D H:m:s')});
    }
    else
      return pool.query("INSERT into event_signup SET ?", {event_id: eventID, username: username, user_id: player.id, type: type, date_added: moment().format('YYYY-M-D H:m:s')});
  }).then(function(results){
    updateEventMessage(eventID);
    // signupAlert(eventID, player, type);
  });
}

function updateEventMessage(eventID) {
  pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, serverID])
  .then(function(results){
    var event = JSON.parse(JSON.stringify(results));
    return event;
  })
  .then(function(event){
    if( event.length > 0 ) {
      pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? AND event.server_id = ? ORDER BY event_signup.date_added ASC", [eventID, serverID])
      .then(function(results){

        eventInfo = getEventInfo(event[0], results);

        eventChannel.fetchMessage(event[0].message_id)
        .then(function(message){
          message.clearReactions().then(function(message){
            message.edit( eventInfo.richEmbed ).then(async function(message){
              if( eventInfo.confirmedCount <= 6 )
                await message.react('🆗');
              await message.react('🤔');
              await message.react('⛔');
            });
          });
        });
      });
    }
  });
}

function getEventInfo(event, signUps) {
  var signupsRows = JSON.parse(JSON.stringify(signUps));
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

  // "Event ID" string used in detection of reaction
  var richEmbed = new Discord.RichEmbed()
    .setTitle( event.event_name + " | Event ID: " + event.event_id )
    .setColor("#DB9834")
    .setDescription( event.event_description );

  richEmbed.addField("Confirmed", confirmed, true);
  richEmbed.addField("Reserve", reserve, true);

  return {
    richEmbed: richEmbed,
    confirmedCount: confirmedCount,
    reserveCount: reserveCount
  };
}

/**************************************************************
            Get and refreshes all events in channel
***************************************************************/

function getEvents() {

  var richEmbed = new Discord.RichEmbed()
    .setTitle("Instructions")
    .setColor("#DB9834")
    .setDescription("Sign up to raids by reacting :ok: to __confirm__ :thinking: to __reserve__ :no_entry: to __remove__ (self)");

  richEmbed.addField(
    "Quick Commands",
    'Full command list: !event help\nCreate event: !event create "31 Dec 8PM Last Wish Speedrun" "min 550 and bring whisper"\nAdd comment: !event comment event_id "comment"',
    true);

  eventChannel.send( richEmbed );

  pool.query("SELECT * FROM event WHERE server_id = ?", [serverID])
  .then(function(results){

    var rows = JSON.parse(JSON.stringify(results));

    for(var i = 0; i < rows.length; i++) {

      let event = rows[i];

      pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
      .then(function(results){

        eventInfo = getEventInfo(event, results);

        eventChannel.send( eventInfo.richEmbed ).then(async function(message){

          pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [message.id, event.event_id]);

          if( eventInfo.confirmedCount <= 6 )
            await message.react('🆗');
          await message.react('🤔');
          await message.react('⛔');
        });
      });
    }
  });
}

/**************************************************************
            Alert creator on sign up
***************************************************************/

function signupAlert(eventID, signup, type) {
  pool.query("SELECT * FROM event WHERE event_id = ?", [eventID])
  .then(function(results){
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

/**************************************************************
            Ping event signups via DM on 👋 reaction
***************************************************************/

function pingEventSignups(eventID) {
  pool.query("SELECT * FROM event_signup LEFT JOIN event ON event_signup.event_id = event.event_id WHERE event_signup.event_id = ? AND event.server_id = ?", [eventID, serverID])
  .then(function(results){
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

/**************************************************************
                !event delete or ❌ reaction
***************************************************************/

function deleteEvent(eventID, player) {

  pool.query("SELECT * FROM event WHERE event_id = ?", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if ( rows[0] ) {
      event = rows[0];
    }

    if ( isAdmin || event.created_by == player.id ) {
      eventChannel.fetchMessage(event.message_id)
      .then(function(message){
        message.delete();
      });

      return pool.query("DELETE FROM event WHERE event_id = ?", [eventID]);
    }
  });
}

/**************************************************************
                    !event edit command
***************************************************************/

function updateEvent(player, eventID, eventName, eventDescription) {
  pool.query("SELECT * FROM event WHERE event_id = ?", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if ( rows[0] ) {
      event = rows[0];
    }

    if ( isAdmin || event.created_by == player.id ) {
      return pool.query("UPDATE event SET event_name = ?, event_description = ? WHERE event_id = ?", [eventName, eventDescription, eventID]);
    }

  }).then(function(){
    updateEventMessage(eventID);
  });
}

/**************************************************************
                    !event create command
***************************************************************/

function createEvent(player, eventName, eventDescription) {
  pool.query("INSERT into event SET ?",
      { server_id: serverID,
        event_name: eventName,
        event_description: eventDescription,
        created_by: player.id,
        date_added: moment().format('YYYY-M-D')
      })
  .then(function(result){

    pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [result.insertId, serverID])
    .then(function(results){

      var rows = JSON.parse(JSON.stringify(results));
      let event = rows[0];

      pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
      .then(function(results){

        eventInfo = getEventInfo(event, results);

        eventChannel.send( eventInfo.richEmbed ).then(async function(message){

          pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [message.id, event.event_id]);

          if( eventInfo.confirmedCount <= 6 )
            await message.react('🆗');
          await message.react('🤔');
          await message.react('⛔');
        });
      });
    });
  });
}

/**************************************************************
                Onload Channel Check / Create
***************************************************************/

async function channelCheck(guild) {
  let channelCategoryExists = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category");
  let channelCategoryID;

  if( channelCategoryExists === null )
    await guild.createChannel(channelCategoryName, "category").then(function(newChannel){
      channelCategoryID = newChannel.id;
    });
  else
    channelCategoryID = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category").id;

  let channelExists = guild.channels.find(channel => channel.name == channelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( channelExists === null )
    await guild.createChannel(channelName, "text").then(function(newChannel){
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
    await guild.createChannel(eventChannelName, "text").then(function(newChannel){
      newChannel.setParent( channelCategoryID );
      eventChannelID = newChannel.id;
      eventChannel = client.channels.get(eventChannelID);
    });
  else {
    eventChannelID = guild.channels.find(channel => channel.name == eventChannelName && channel.type == "text" && channel.parentID == channelCategoryID).id;
    eventChannel = client.channels.get(eventChannelID);
  }
}

/**************************************************************
              Learning Interest List Functions
***************************************************************/


function sub(raid, player, comment, message) {

  username = player.nickname ? player.nickname : player.username;

  pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
  .then(function(results){
    return pool.query("INSERT into interest_list SET ?", {raid: raid, username: username, user_id: player.id, comment: comment, server_id: message.guild.id, date_added: moment().format('YYYY-M-D')});
  }).then(function(results){
    getInterestList();
  });
}

function unSub(raid, player, message) {
  pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
  .then(function(results){
    getInterestList();
  });
}

function unSubAll(raid, message) {
  pool.query("DELETE FROM interest_list where raid = ? AND server_id = ?", [raid, message.guild.id])
  .then(function(results){
    getInterestList();
  });
}

function getInterestList() {

  raids = {
    'Levi': [],
    'EoW': [],
    'SoS': [],
    'Wish': [],
    'Scourge': []
  };

  pool.query("SELECT * FROM interest_list WHERE server_id = ?", [serverID])
  .then(function(results){

    var rows = JSON.parse(JSON.stringify(results));

    for(var i = 0; i < rows.length; i++) {
      raids[ rows[i]['raid'] ][ rows[i]['username'] ] = rows[i]['comment'] ? rows[i]['comment'] : "";
    }

    return raids;
  })
  .then(function(raids){

    clear(channel);

    // Instructions
    var richEmbed = new Discord.RichEmbed()
      .setTitle("Teaching Raid LFG")
      .setColor("#DB9834")
      .setDescription("Subscribe to let mods / sherpas know when and what raids you're interested to learn.");

    channel.send( richEmbed );

    // Interest list
    for ( var raid in raids ) {
      if ( Object.keys(raids[raid]).length > 0 ) {
        richEmbed = new Discord.RichEmbed()
        .setTitle(config.raidNameMapping[raid] + " ("+Object.keys(raids[raid]).length+")")
        .setColor("#DB9834")
        .setDescription('```css\n' + printUsernameRemarks( raids[raid] ) + '```');

        channel.send( richEmbed );
      }
    }

    // Commands
    richEmbed = new Discord.RichEmbed()
    .setTitle(helpTxt.name)
    .setColor("#DB9834")
    .setDescription(helpTxt.value);

    channel.send( richEmbed );
  });
}

function printUsernameRemarks( raid ) {
  var txt = '';

  for ( name in raid ) {
    txt += "• " + name;
    txt += raid[name] ? " - "+raid[name]+"" : "";
    txt += "\n";
  }

  return txt;
}

/**************************************************************
                    Parse Raid Names
***************************************************************/

function smartInputDetect(raidName) {

  var leviMatches = ['levi', 'lev', 'leviathan'];
  var eowMatches = ['eow', 'eater'];
  var sosMatches = ['sos', 'spires', 'stars'];
  var wishMatches = ['wish', 'last', 'riven'];
  var scourgeMatches = ['scourge', 'scorge', 'scourge of the past', 'past'];

  if( leviMatches.includes(raidName.toLowerCase()) )
    return 'Levi'
  else if( eowMatches.includes(raidName.toLowerCase()) )
    return 'EoW'
  else if( sosMatches.includes(raidName.toLowerCase()) )
    return 'SoS'
  else if( wishMatches.includes(raidName.toLowerCase()) )
    return 'Wish'
  else if( scourgeMatches.includes(raidName.toLowerCase()) )
    return 'Scourge'
  else return 'dadaffsdfsdgsdg';
}

client.login(config.token);
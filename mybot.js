/******************************
  Variables & Libs
*******************************/

const config = require('./config').production;
const pool = config.getPool();

const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();

let raids = {
  'Levi': [],
  'PLevi': [],
  'EoW': [],
  'SoS': [],
  'Wish': [],
  'Riven': [],
  'Scourge': [],
};

const helpTxt = {
  name: 'Commands',
  value:
  'Subscribe to let clan sherpas know you\'re interested in learning a certain raid so they can get in touch should they organize a learning run. Except for legit Riven, you will be automatically removed once a raid completion has been detected.\n\n' +
  "Quick Commands\n" +
  '-----------------------\n' +
  'Subscribe - !sub levi/plevi/eow/sos/wish/riven/scourge comments\n' +
  'Unsubscribe - !unsub levi/plevi/eow/sos/wish/riven/scourge\n\n' +
  'Admin/Mods only\n' +
  '-----------------------\n' +
  'Add - !add levi/plevi/eow/sos/wish/riven/scourge @user\n' +
  'Remove - !remove levi/plevi/eow/sos/wish/riven/scourge @user\n' +
  'Ping - !ping levi/plevi/eow/sos/wish/riven/scourge message\n'
}

const eventHelpTxt =
  '```' +
  'SG-E Bot Event Commands\n------------------------\n' +
  'Enter the commands in discord channel and NOT here.\n\n' +
  'Create: !event create "event name goes here" "event description goes here"\n' +
  'e.g. !event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"\n\n' +

  'Delete: !event delete event_id OR react with ❌ on the event\n' +
  'e.g. !event delete 5\n\n' +

  'Edit: !event edit event_id "event name goes here" "event description goes here"\n' +
  'e.g. !event edit 5 "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"\n\n' +

  'Notify: React with 👋 on the event to ping all users that are signed up\n\n' +

  'Add/Edit Comment: !event comment event_id "comment"\n' +
  'e.g. !event comment 5 "First timer here!"\n\n' +

  'Search: !event levi/sos/eow/lw/wish/sotp/scourge\n\n' +

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
//client.on("debug", (e) => console.info(e));

client.on("ready", () => {
  console.log(timestampPrefix() + "I am ready!");
  updateAllServers();
  client.user.setStatus('available');
  client.user.setPresence({ game: { name: 'Destiny 2', type: "playing"}});

  setInterval(function(){
    updateBotStatus();
  }, 30000);

  setInterval(function(){
    console.log(timestampPrefix() + "Refreshing events channel");
    clear(eventChannel);
    getEvents(); // refresh and re-sort event channel every 3 hours
  }, 3600000*3);
});

client.on("guildCreate", guild => {
    console.log(timestampPrefix() + "Joined a new guild: " + guild.name);
    serverID = guild.id;
    channelCheck(guild);
});

client.on('messageReactionAdd', (reaction, user) => {

  if ( reaction.message.guild === null ) return; // Disallow DM
  if ( user.bot ) return;

  console.log( timestampPrefix() + reaction.emoji + " By: " + user.username + " on Message ID: " + reaction.message.id );

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
          joinEvent(eventID, guildMember, "confirmed", guildMember);
        });
      }

      if(reaction.emoji.name === "🤔") {
        reaction.message.guild.fetchMember(user).then(function(guildMember){
          joinEvent(eventID, guildMember, "reserve", guildMember);
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

  console.log( timestampPrefix() + "Message: " + message.content + " By: " + message.author.username );

  message.content = message.content.replace(/“/g, '"').replace(/”/g, '"');

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

  if ( command === "event" ) {

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

          event_date_string = eventName.trim().split(/ +/g).slice(0,3).join(' ');

          if( moment( event_date_string, 'DD MMM h:mmA' ).isValid() === false || eventName.length < 7 ) {
            message.author.send('Create event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
            break;
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
          let eventID = parseInt(args[1]);

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

            event_date_string = eventName.trim().split(/ +/g).slice(0,3).join(' ');

            if( moment( event_date_string, 'DD MMM h:mmA' ).isValid() === false || eventName.length < 7 ) {
              message.author.send('Edit event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event edit event_id "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
              break;
            }

            updateEvent(message.author, eventID, eventName, eventDescription);
          }
        }
        break;

      // Add users to events !event add event_id @user confirmed|reserve
      case "add":
        if ( args.length > 1 && message.mentions.users.first() ) {
          let eventID = parseInt(args[1]);
          let player = message.mentions.users.first();
          let type = args[3] ? args[3] : "";
          type = (type == "reserve") ? "reserve" : "confirmed";

          if( eventID && player ) {
            message.guild.fetchMember(player)
            .then(function(member){
              add2Event(eventID, type, message.member, member);
            })
          }
        }

        break;

      // Add users to events !event remove event_id @user
      case "remove":
        if ( args.length > 1 && message.mentions.users.first() ) {
          let eventID = parseInt(args[1]);
          let player = message.mentions.users.first();

          if( eventID && player ) {
            removeFromEvent(eventID, message.author, player);
          }
        }

        break;

      // !event comment 5 Petra's run maybe?
      case "comment":
        if ( args.length > 1 ) {
          let eventID = parseInt(args[1]);
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
          let eventID = parseInt(args[1]);
          joinEvent(eventID,  message.member);
        }

        break;

      // Alternative command to unsub
      // !event unsub event_id
      case "unsub":
        if ( args.length > 1 ) {
          let eventID = parseInt(args[1]);
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
        if( smartInputDetect(args[0]) ) {
          searchEvents( args[0], message.author );
        }
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

  else if ( command === "sub" ) {
    if( args[0] ) {
      let raidInterested = smartInputDetect( args[0] );
      let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

      for ( var raidName in raids ) {
        if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
          sub(raidName, message.member, remarks, message);
        }
      }
    }
  }

  else if ( command === "unsub" ) {
    if( args[0] ) {
      let raidInterested = smartInputDetect( args[0] );
      let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

      for ( var raidName in raids ) {
        if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
          unSub(raidName, message.member, message);
        }
      }
    }
  }

  else if ( command === "add" ) {
    let raidInterested = smartInputDetect( args[0] );
    let remarks = args[2] ? args.slice(2, args.length).join(" ") : "";

    for ( var raidName in raids ) {
      if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {

        if( args[1] && isAdmin === true ) {
          let user = message.mentions.members.first();

          if( user ) {
            sub(raidName, user, remarks, message);
          }
        }
      }
    }
  }

  else if ( command === "remove" ) {
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

  else if ( command === "ping" ) {
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

  else if ( command === "show" ) {
    getInterestList(message);
  }

  else if ( command === "clear" || command === "refresh" ) {
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

function timestampPrefix() {
  return "[" + moment().format() + "] ";
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

/**************************************************************
      Bot Status Message - Fetching random online member
***************************************************************/

function updateBotStatus() {
  eventChannel.guild.fetchMembers().then(function(guild){
    members = guild.members
    .filter(members => { return members.presence.status === 'online' && members.user.bot === false })
    .map(member => { return { nickname: member.nickname, username: member.user.username }});

    if( members.length > 0 ) {
      randomMember = members[ Math.floor(Math.random() * members.length) ];
      randomMemberName = randomMember.nickname ? randomMember.nickname : randomMember.username;

      // console.log(timestampPrefix() + "Updated bot status: " + "Playing Destiny 2 with " + randomMemberName);
      client.user.setPresence({ game: { name: 'Destiny 2 with ' + randomMemberName, type: "playing"}});
    }
  });
}

/**************************************************************
                    Unsub from event
***************************************************************/

function unSubEvent(eventID, player) {
  console.log( timestampPrefix() + "Unsubbed from event ID: " + eventID );
  pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
  .then(function(results){
    updateEventMessage(eventID);
  });
}

function removeFromEvent(eventID, user, player) {
  pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      console.log( timestampPrefix() + "Removed from event ID: " + eventID );
      unSubEvent(eventID, player);
    }
  });
}

/**************************************************************
                  Add comment to signups
***************************************************************/

function updateEventAddComment(eventID, user, comment) {
  pool.query("UPDATE event_signup SET comment = ? WHERE event_id = ? AND user_id = ?", [comment, eventID, user.id])
  .then(function(results){
    updateEventMessage(eventID);
  });
}

/**************************************************************
                        Join Event
***************************************************************/

function add2Event(eventID, type, user, player) {
  pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if( rows[0].created_by == user.id || isAdmin ) {
      console.log( timestampPrefix() + "Added to event ID: " + eventID );
      joinEvent(eventID, player, type, user);
    }
  });
}

function joinEvent(eventID, player, type="confirmed", addedByUser="") {
  pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
  .then(function(results){
    username = player.nickname ? player.nickname : player.user.username;

    console.log( timestampPrefix() + "Joining event ID: " + eventID );

    if ( addedByUser ) {
      addedByUserName = addedByUser.nickname ? addedByUser.nickname : addedByUser.user.username;
      return pool.query("INSERT into event_signup SET ?", {event_id: eventID, username: username, user_id: player.id, type: type, added_by_user_id: addedByUser.id, added_by_username: addedByUserName, date_added: moment().format('YYYY-M-D H:m:s')});
    }
    else
      return pool.query("INSERT into event_signup SET ?", {event_id: eventID, username: username, user_id: player.id, type: type, date_added: moment().format('YYYY-M-D H:m:s')});
  }).then(function(results){
    updateEventMessage(eventID);
    // signupAlert(eventID, player, type);
  });
}

/**************************************************************
                  Update existing event message
***************************************************************/

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

        if( event[0].message_id > 0 ) {

          eventInfo = getEventInfo(event[0], results);

          eventChannel.fetchMessage(event[0].message_id)
          .then(function(message){
            message.clearReactions().then(function(message){
              message.edit( eventInfo.richEmbed ).then(async function(message){
                if( results.filter(row => row.type == "confirmed").length < 6 )
                  await message.react('🆗');
                await message.react('🤔');
                await message.react('⛔');
              });
            });
          });
        }
      });
    }
  });
}

/**************************************************************
              Text content of each event embed
***************************************************************/

function getEventInfo(event, signUps) {

  var signupsRows = JSON.parse(JSON.stringify(signUps));
  var confirmed = "";
  var confirmedCount = 1;
  var reserve = "";
  var reserveCount = 1;
  var creator = event.created_by_username ? event.created_by_username : "";

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

  let color = detectRaidColor( event.event_name );

  // "Event ID" string used in detection of reaction
  var richEmbed = new Discord.RichEmbed()
    .setTitle( event.event_name + " | Event ID: " + event.event_id )
    .setColor( color )
    .setDescription( event.event_description );

  richEmbed.addField("Confirmed" + (confirmedCount-1==6?" [Full]":""), confirmed, true);
  richEmbed.addField("Reserve", reserve, true);


  if (creator)
    richEmbed.addField("Created By", creator);

  return {
    richEmbed: richEmbed,
    confirmedCount: confirmedCount,
    reserveCount: reserveCount
  };
}

function detectRaidColor(eventName) {
  if ( eventName.toLowerCase().includes("levi") )
    return config.raidColorMapping['Levi'];
  else if ( eventName.toLowerCase().includes("eow") || eventName.toLowerCase().includes("eater") )
    return config.raidColorMapping['EoW'];
  else if ( eventName.toLowerCase().includes("sos") || eventName.toLowerCase().includes("spire") )
    return config.raidColorMapping['SoS'];
  else if ( eventName.toLowerCase().includes("lw") || eventName.toLowerCase().includes("wish") )
    return config.raidColorMapping['Wish'];
  else if ( eventName.toLowerCase().includes("sotp") || eventName.toLowerCase().includes("scourge") )
    return config.raidColorMapping['Scourge'];
  else
    return config.raidColorMapping['default'];
}

/**************************************************************
          Get events which name matches and DM user
***************************************************************/

function searchEvents(searchStr, player) {

  pool.query("SELECT * FROM event WHERE server_id = ? AND event_name LIKE ? AND status = 'active' AND ( event_date IS NULL OR event_date >= CURDATE() ) ORDER BY event_date ASC", [serverID, '%'+searchStr+'%'])
  .then(async function(results){

    var rows = JSON.parse(JSON.stringify(results));

    var richEmbed = new Discord.RichEmbed()
      .setTitle("Your search for events matching __"+searchStr+"__ resulted in " + rows.length + " results.")
      .setColor("#DB9834");

    player.send(richEmbed);

    for(var i = 0; i < rows.length; i++) {

      let event = rows[i];

      await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
      .then(async function(results){

        eventInfo = getEventInfo(event, results);

        player.send(eventInfo.richEmbed);
      });
    }
  });
}

/**************************************************************
            Get and refreshes all events in channel
***************************************************************/

function getEvents() {

  var richEmbed = new Discord.RichEmbed()
    .setTitle("Instructions")
    .setColor("#DB9834")
    .setDescription("Sign up to raids by reacting :ok: to __confirm__ :thinking: to __reserve__ :no_entry: to __withdraw__");

  richEmbed.addField(
    "Quick Commands",
    '__Create event__ \n!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"\n\n__Please follow the standard format__ \n"Date Time [Levi/EoW/SoS/LW/SoTP] Event Title" "Optional Description"\n\n__Full command list__ \n!event help',
    true);

  eventChannel.send( "If you're unable to see anything in this channel, make sure User Settings > Text & Images > Link Preview is checked." );
  eventChannel.send( richEmbed );

  pool.query("SELECT * FROM event WHERE server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) ORDER BY event_date IS NULL DESC, event_date ASC", [serverID])
  .then(async function(results){

    var rows = JSON.parse(JSON.stringify(results));

    for(var i = 0; i < rows.length; i++) {

      let event = rows[i];

      await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
      .then(async function(results){

        eventInfo = getEventInfo(event, results);

        console.log( timestampPrefix() + 'Printing Event ID: ' + event.event_id + ' "' + event.event_name + '" By: ' + event.created_by_username );

        await eventChannel.send( eventInfo.richEmbed ).then(async function(message){

        console.log( timestampPrefix() + 'Message ID: ' + message.id );

          if( results.filter(row => row.type == "confirmed").length < 6 )
            await message.react('🆗');
          await message.react('🤔');
          await message.react('⛔');

          client.fetchUser(event.created_by).then(function(user){
            eventChannel.guild.fetchMember(user).then(function(member){
              creator = member.nickname ? member.nickname : member.user.username;
              event_date_string = event.event_name.trim().split(/ +/g).slice(0,3).join(' ');
              event_date = moment( event_date_string, 'DD MMM h:mmA' ).isValid() ? moment( event_date_string, 'DD MMM h:mmA' ).format(moment().year()+'-MM-DD HH:mm:ss') : null;
              pool.query("UPDATE event SET message_id = ?, event_date = ?, created_by_username = ? WHERE event_id = ?", [message.id, event_date, creator, event.event_id]);
            })
          });
        });
      });
    }
  });
}

/**************************************************************
              Alert event creator on sign up
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

  pool.query("SELECT * FROM event WHERE event_id = ? AND status = 'active'", [eventID])
  .then(function(results){
    var rows = JSON.parse(JSON.stringify(results));

    if ( rows[0] ) {
      event = rows[0];
    }
    else
      return;

    if ( isAdmin || event.created_by == player.id ) {
      console.log( timestampPrefix() + 'Deleted Event ID: ' + eventID + ' "' + event.event_name + '"');

      eventChannel.fetchMessage(event.message_id)
      .then(function(message){
        message.delete();
      });
      // pool.query("DELETE FROM event_signup WHERE event_id = ?", [eventID]);
      return pool.query("UPDATE event SET status = 'deleted' WHERE event_id = ?", [eventID]);
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
      event_date_string = eventName.trim().split(/ +/g).slice(0,3).join(' ');
      event_date = moment( event_date_string, 'DD MMM h:mmA' ).isValid() ? moment( event_date_string, 'DD MMM h:mmA' ).format(moment().year()+'-MM-DD HH:mm:ss') : null;
      return pool.query("UPDATE event SET event_name = ?, event_description = ?, event_date = ? WHERE event_id = ?", [eventName, eventDescription, event_date, eventID]);
    }

  }).then(function(){
    updateEventMessage(eventID);
  });
}

/**************************************************************
                    !event create command
***************************************************************/

function createEvent(player, eventName, eventDescription) {

  eventChannel.guild.fetchMember(player)
  .then(function(member){

    creator = member.nickname ? member.nickname : member.user.username;
    event_date_string = eventName.trim().split(/ +/g).slice(0,3).join(' ');
    event_date = moment( event_date_string, 'DD MMM h:mmA' ).isValid() ? moment( event_date_string, 'DD MMM h:mmA' ).format(moment().year()+'-MM-DD HH:mm:ss') : null;

    pool.query("INSERT into event SET ?",
        { server_id: serverID,
          event_name: eventName,
          event_description: eventDescription,
          event_date: event_date,
          created_by: player.id,
          created_by_username: creator,
          date_added: moment().format('YYYY-M-D HH:mm:ss')
        })
    .then(function(result){

      eventChannel.guild.fetchMember(player)
      .then(function(member){
        joinEvent(result.insertId, member);
      });

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
  })
}

/**************************************************************
                Onload Channel Check / Create
***************************************************************/

async function channelCheck(guild) {
  let channelCategoryExists = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category");
  let channelCategoryID;

  if( channelCategoryExists === null )
    await guild.createChannel(channelCategoryName, "category").then(async function(newChannel){
      channelCategoryID = await newChannel.id;
    });
  else
    channelCategoryID = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category").id;

  let channelExists = guild.channels.find(channel => channel.name == channelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( channelExists === null )
    await guild.createChannel(channelName, "text").then(async function(newChannel){
      newChannel.setParent( channelCategoryID );
      channelID = newChannel.id;
      channel = await client.channels.get(channelID);
    });
  else {
    channelID = guild.channels.find(channel => channel.name == channelName && channel.type == "text" && channel.parentID == channelCategoryID).id;
    channel = client.channels.get(channelID);
  }

  let eventChannelExists = guild.channels.find(channel => channel.name == eventChannelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( eventChannelExists === null )
    await guild.createChannel(eventChannelName, "text").then(async function(newChannel){
      newChannel.setParent( channelCategoryID );
      eventChannelID = newChannel.id;
      eventChannel = await client.channels.get(eventChannelID);
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

  username = player.nickname ? player.nickname : player.user.username;

  pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
  .then(function(results){
    return pool.query("INSERT into interest_list SET ?", {raid: raid, username: username, user_id: player.id, comment: comment, server_id: message.guild.id, date_added: moment().format('YYYY-M-D')});
  }).then(function(results){
    updateInterestList(raid);
    //getInterestList();
  });
}

function unSub(raid, player, message) {
  pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
  .then(function(results){
    updateInterestList(raid);
    //getInterestList();
  });
}

function unSubAll(raid, message) {
  pool.query("DELETE FROM interest_list where raid = ? AND server_id = ?", [raid, message.guild.id])
  .then(function(results){
    updateInterestList(raid);
    //getInterestList();
  });
}

/**************************************************************
              Update existing message on sub / unsub
***************************************************************/

function updateInterestList(raid) {

  channel.fetchMessages().then(function(messages){
    // Getting message id of current message in channel by matching raid name in embed title
    let raid_name = config.raidNameMapping[raid];
    let message_id = messages.filter(message => { if( message.embeds[0] ) return message.embeds[0].title == (raid_name + " - !sub " + raid) }).map(message => { return message.id });

    pool.query("SELECT * FROM interest_list WHERE server_id = ? AND raid = ?", [serverID, raid])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows.length > 0 ) {

        var r = [];

        for( var i = 0; i < rows.length; i++ ) {
          r[ rows[i].username ] = rows[i]['comment'] ? rows[i]['comment'] : "";
        }

        var richEmbed = new Discord.RichEmbed()
        .setTitle(config.raidNameMapping[raid] + " - !sub " + raid)
        .setColor(config.raidColorMapping[raid])
        .setImage(config.raidImgs[raid])
        .setDescription( printUsernameRemarks( r ) );

        if( message_id == '' ) {
          //channel.send( richEmbed );
          getInterestList();
        }
        else {
          channel.fetchMessage(message_id).then(function(message){
            message.edit(richEmbed);
          });
        }
      }
      // Nobody on interest list
      else {
        // Remove message
        if( message_id != '' ) {
          channel.fetchMessage(message_id).then(function(message){
            message.delete();
          });
        }
      }
    });
  });
}

/**************************************************************
                Refresh channel with results
***************************************************************/

function getInterestList() {

  raids = {
    'Levi': [],
    'PLevi': [],
    'EoW': [],
    'SoS': [],
    'Wish': [],
    'Riven': [],
    'Scourge': [],
  };

  pool.query("SELECT * FROM interest_list WHERE server_id = ? ORDER BY FIELD(raid, 'levi', 'plevi', 'eow', 'sos', 'wish', 'riven', 'scourge')", [serverID])
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
      .setTitle("Teaching Raid LFG Instructions")
      .setColor("#DB9834")
      .setDescription(helpTxt.value);

    channel.send( richEmbed );

    // Interest list
    for ( var raid in raids ) {
      if ( Object.keys(raids[raid]).length > 0 ) {
        richEmbed = new Discord.RichEmbed()
        .setTitle(config.raidNameMapping[raid] + " - !sub " + raid)
        .setColor(config.raidColorMapping[raid])
        .setImage(config.raidImgs[raid])
        .setDescription( printUsernameRemarks( raids[raid] ) );

        channel.send( richEmbed );
      }
    }
  });
}

function printUsernameRemarks( raid ) {
  let txt = '';
  let i = 1;

  for ( name in raid ) {
    txt += "• " + name;
    txt += raid[name] ? " - "+raid[name]+"" : "";
    txt += "\n"
    i++;
  }

  return '`' + txt + '`';
}

/**************************************************************
                    Parse Raid Names
***************************************************************/

function smartInputDetect(raidName='') {

  var leviMatches = ['levi', 'lev', 'leviathan'];
  var pleviMatches = ['plevi'];
  var eowMatches = ['eow', 'eater'];
  var sosMatches = ['sos', 'spires', 'stars'];
  var wishMatches = ['wish', 'last', 'lw'];
  var rivenMatches = ['riven', 'legit'];
  var scourgeMatches = ['scourge', 'scorge', 'scourge of the past', 'past', 'sotp'];

  if( leviMatches.includes(raidName.toLowerCase()) )
    return 'Levi'
  if( pleviMatches.includes(raidName.toLowerCase()) )
    return 'PLevi'
  else if( eowMatches.includes(raidName.toLowerCase()) )
    return 'EoW'
  else if( sosMatches.includes(raidName.toLowerCase()) )
    return 'SoS'
  else if( wishMatches.includes(raidName.toLowerCase()) )
    return 'Wish'
  else if( rivenMatches.includes(raidName.toLowerCase()) )
    return 'Riven'
  else if( scourgeMatches.includes(raidName.toLowerCase()) )
    return 'Scourge'
  else return '';
}

client.login(config.token);
let sgeServerID = '372462137651757066';
let happyMealServerID = '480757578612342784';

/******************************
  Prod / Dev
*******************************/

const config = require('./config').production;

/******************************
  Variables & Libs
*******************************/

const pool = config.getPool();
const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();
const raidEvent = new Event();
const interestList = new InterestList();
const eventDatetimeFormats = [
  'D MMM HHmm', // 1730
  'D MMM h:mmA', // 5:30PM
  'D MMM h:mm A', // 5:30 PM
  'D MMM hA', // 5PM
  'D MMM h A'// 5 PM
];

let isAdmin = false;
let maxConfirmed = 6;
let raids = {
  'Levi': [],
  'PLevi': [],
  'EoW': [],
  'SoS': [],
  'Wish': [],
  'Riven': [],
  'Scourge': [],
};

/******************************
  Text Channels
*******************************/

const channelCategoryName = "Looking for Group";
const channelName = "🚩raid_newbie_signup"; // no spaces all lower case
const eventChannelName = "🚩raid_lfg"; // no spaces all lower case
let channel;
let eventChannel;
let serverID; // also known as guild id

/******************************
  Event Listeners
*******************************/

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
//client.on("debug", (e) => console.info(e));

client.on("ready", async function() {
  console.log(timestampPrefix() + "I am ready!");
  await updateAllServers();
  client.user.setStatus('available');
  client.user.setPresence({ game: { name: 'Destiny 2', type: "playing"}});

  setInterval(function(){
    if( client.guilds.size > 0 ) {
      client.guilds.forEach(function(guild){
        if( guild.available ) {
          channelCheck(guild).then(function(channels){
            updateBotStatus(channels.eventChannel);
          });
        }
      })
    }
  }, 30000);

  // Reorder every server's events occasionally
  setInterval(function(){
    if( client.guilds.size > 0 ) {
      client.guilds.forEach(function(guild){
        if( guild.available ) {
          channelCheck(guild).then(function(channels){
            raidEvent.reorder(channels.eventChannel);
          });
        }
      })
    }
  }, 60000);
});

client.on("guildCreate", async function(guild) {
    console.log(timestampPrefix() + "Joined a new guild: " + guild.name);
    serverID = guild.id;
    await channelCheck(guild);
});

client.on('messageReactionAdd', async function(reaction, user) {

  // Checks before proceeding
  if ( reaction.message.guild === null ) return; // Disallow DM
  if ( user.bot ) return;

  await channelCheck(reaction.message.guild).then(async function(channels){

    if( reaction.message.channel.name != eventChannelName ) return;

    serverID = reaction.message.guild.id;
    eventID = 0;
    maxConfirmed = (serverID == sgeServerID) ? 6 : 999;

    console.log( timestampPrefix() + "Server ID: " + serverID );
    console.log( timestampPrefix() + reaction.emoji + " By: " + user.username + " on Message ID: " + reaction.message.id );

    isAdmin = (serverID == happyMealServerID ||
      reaction.message.member.roles.find(roles => roles.name === "Admin") ||
      reaction.message.member.roles.find(roles => roles.name === "Clan Mods") ||
      Object.keys(config.adminIDs).includes(user.id) ||
      Object.keys(config.sherpaIDs).includes(user.id)) ? true : false;

    eventName = reaction.message.embeds[0].message.embeds[0].title ? reaction.message.embeds[0].message.embeds[0].title : "";

    if( eventName ) {
      message_id = reaction.message.id;
      eventID = await pool.query("SELECT * FROM event WHERE message_id = ? AND server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) LIMIT 1", [message_id, serverID]).then(function(results){
        if( results.length > 0 )
          return results[0].event_id;
      });

      if( eventID ) {
        if(reaction.emoji.name === "🆗") {
          reaction.message.guild.fetchMember(user).then(function(guildMember){
            raidEvent.sub(reaction.message, eventID, guildMember, "confirmed", guildMember);
          });
        }

        else if(reaction.emoji.name === "🤔") {
          reaction.message.guild.fetchMember(user).then(function(guildMember){
            raidEvent.sub(reaction.message, eventID, guildMember, "reserve", guildMember);
          });
        }

        else if(reaction.emoji.name === "⛔") {
          raidEvent.unsub(reaction.message, eventID, user);
        }

        else if(reaction.emoji.name === "❌") {
          raidEvent.remove(reaction.message, eventID, user);
        }

        else if(reaction.emoji.name === "👋") {

          let creator_id = await pool.query("SELECT * FROM event WHERE message_id = ? AND server_id = ? LIMIT 1", [message_id, serverID]).then(function(results){
            return results[0].created_by;
          })
          .error(function(e){
            return 0;
          });

          if( user.id == creator_id || isAdmin ) {
            console.log("Sending event signup ping for message ID: " + message_id + " by: " + user.username);

            reaction.message.guild.fetchMember(user).then(function(guildMember){
              raidEvent.pingEventSignups(eventID, guildMember);
            });
          }
        }
      }
      else
        raidEvent.reorder(eventChannel);
    }
  });
});

client.on("message", async function(message) {

  // Checks before proceeding
  if ( message.author.bot ) return;
  if ( message.channel.name != eventChannel.name && message.channel.name != channel.name ) return;
  if ( message.guild === null ) return; // Disallow DM

  console.log( timestampPrefix() + "Server ID: " + serverID );
  console.log( timestampPrefix() + "Message: " + message.content + " By: " + message.author.username );

  message.content = message.content.replace(/“/g, '"').replace(/”/g, '"');
  serverID = message.guild.id;
  isAdmin = (serverID == happyMealServerID ||
    message.member.roles.find(roles => roles.name === "Admin") ||
    message.member.roles.find(roles => roles.name === "Clan Mods") ||
    Object.keys(config.adminIDs).includes(message.member.id) ||
    Object.keys(config.sherpaIDs).includes(message.member.id)) ? true : false;

  maxConfirmed = (serverID == sgeServerID) ? 6 : 999;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  await channelCheck(message.guild).then(async function(channels){

    /****************************
          #raid_lfg channel
    *****************************/

    if( message.channel == eventChannel ) {
      if ( command === "event" ) {

        switch ( args[0] ) {

          // !event create "20 Feb 9pm [Levi] Speed Run" "Bring raid banners!"
          case "create":
            if ( args.length > 1 ) {

              let eventName = raidEvent.parseEventNameDescription(args).eventName;
              let eventDescription = raidEvent.parseEventNameDescription(args).eventDescription;
              let event_date_string = getEventDatetimeString(eventName);

              if( isEventDatetimeValid(event_date_string) === false || eventName.length < 7 ) {
                message.author.send('Create event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
                break;
              }

              raidEvent.create(message, eventName, eventDescription);
            }

            break;

          // Restricted to message author or admin
          // !event delete event_id
          case "delete":
            if ( args.length > 1 ) {
              let eventID = args[1];
              raidEvent.remove(message, eventID, message.author);
            }

            break;

          // Restricted to message author or admin
          // !event edit event_id "event_name" "event_description"
          case "edit":
            if ( args.length > 1 ) {
              let eventID = parseInt(args[1]);

              if ( eventID ) {
                args.splice(1, 1);
                let eventName = raidEvent.parseEventNameDescription(args).eventName;
                let eventDescription = raidEvent.parseEventNameDescription(args).eventDescription;
                let event_date_string = getEventDatetimeString(eventName);

                if( isEventDatetimeValid(event_date_string) === false || eventName.length < 7 ) {
                  message.author.send('Edit event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event edit event_id "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
                  break;
                }

                raidEvent.update(message, eventID, eventName, eventDescription);
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
                message.guild.fetchMember(player).then(function(member){
                  raidEvent.add2Event(message, eventID, type, message.member, member);
                });
              }
            }

            break;

          // Add users to events !event remove event_id @user
          case "remove":
            if ( args.length > 1 && message.mentions.users.first() ) {
              let eventID = parseInt(args[1]);
              let player = message.mentions.users.first();

              if( eventID && player ) {
                raidEvent.removeFromEvent(message, eventID, message.author, player);
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
                raidEvent.addComment(message, eventID, player, comment);
              }
            }

            break;

          // Alternative command to sign up
          // !event sub event_id
          case "sub":
            if ( args.length > 1 ) {
              let eventID = parseInt(args[1]);
              raidEvent.sub(message, eventID, message.member);
            }

            break;

          // Alternative command to unsub
          // !event unsub event_id
          case "unsub":
            if ( args.length > 1 ) {
              let eventID = parseInt(args[1]);
              raidEvent.unsub(message, eventID, message.author);
            }

            break;

          // !event help
          case "help":
            message.author.send(config.eventHelpTxt);
            break;

          default:
            if( smartInputDetect(args[0]) ) {
              raidEvent.search(args[0], message.author);
            }
            break;
        }
      }

      else if ( command === "reorder" ) {
        if ( isAdmin ) {
          raidEvent.reorder(eventChannel);
        }
      }

      else if ( command === "clear" || command === "refresh" ) {
        if ( isAdmin ) {
          raidEvent.getEvents(eventChannel);
        }
      }
    }

    /************************************
          #raid_newbies_signup channel
    *************************************/

    if( message.channel == channel ) {
      if ( command === "sub" ) {
        if( args[0] ) {
          let raidInterested = smartInputDetect( args[0] );
          let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

          for ( var raidName in raids ) {
            if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
              interestList.sub(raidName, message.member, remarks, message);
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
              interestList.unsub(raidName, message.member, message);
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
                interestList.sub(raidName, user, remarks, message);
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
                interestList.unsub(raidName, user, message);
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
              pool.query("SELECT * FROM interest_list WHERE server_id = ? AND raid = ?", [serverID, raidInterested]).then(function(results) {
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

      else if ( command === "show" || command === "clear" || command === "refresh" ) {
        if ( isAdmin ) {
          interestList.getInterestList(channel);
        }
      }
    }

    if ( command === "food" ) {
      message.author.send( foodList() );
    }

    // Delete message after processed to keep channels clean
    if ( message.channel === eventChannel || message.channel === channel )
      message.delete();
  })
});

/******************** **********
  Helper Functions
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

function getEventDatetimeString(eventName) {
  let indexOfTab = eventName.indexOf("[");

  if( indexOfTab >= 0 )
    return eventName.substring(0, indexOfTab-1);
  else
    return '';
}

function isEventDatetimeValid(event_date_string) {

  for(var key in eventDatetimeFormats) {
    if( moment(event_date_string, eventDatetimeFormats[key], true).isValid() )
      return moment( event_date_string, eventDatetimeFormats[key] ).format(moment().year()+'-MM-DD HH:mm:ss')
  }

  // If no matches from strict match, check for no time specified
  if( moment(event_date_string, 'D MMM', true).isValid() )
    return moment( event_date_string, 'D MMM' ).format(moment().year()+'-MM-DD 23:59:59')

  return false;
}

async function updateAllServers() {
  for( var guild of client.guilds.values() ) {
    serverID = guild.id;

    await channelCheck(guild).then(async function(channels){
      if( channels.channel )
        await interestList.getInterestList(channels.channel);
      if( channels.eventChannel )
        await raidEvent.getEvents(channels.eventChannel);
    });
  }
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

function foodList() {
  let foodOptions = {
    'Mcdonalds': 'https://www.mcdelivery.com.sg/sg/browse/menu.html',
    'KFC': 'https://www.kfc.com.sg/Menu',
    'Pizza Hut': 'https://www.pizzahut.com.sg/promotions/delivery',
    'Dominos': 'https://www.dominos.com.sg/ordering/info',
    'Canadian Pizza': 'https://www.canadian-pizza.com/pizzas',
    'Sarpinos': 'https://sarpinos.com/sg/online-ordering/',
    'Golden Pillow': 'http://www.goldenpillow933.com.sg/products.htm',
    'Pastamania': 'http://www.pastamaniadelivery.sg/'
  };

  let metaFoodOptions = {
    'Foodpanda': 'https://www.foodpanda.sg/',
    'Honestbee': 'https://www.honestbee.sg/en/food',
    'Deliveroo': 'https://deliveroo.com.sg',
  };

  let richEmbed = new Discord.RichEmbed()
    .setColor("#4169E1")
    .setAuthor("Butler", "https://cdn-images-1.medium.com/max/1600/1*RmcSmwPhUn8ljLiiwYxK0A.png");

  let foodOptionsKeys = Object.keys(foodOptions).sort();
  let str = '';

  for(var i=0; i<foodOptionsKeys.length; i++) {
    str += "["+foodOptionsKeys[i]+"]("+foodOptions[foodOptionsKeys[i]]+")\n";
  }

  richEmbed.addField("Direct Food Deliveries", str, true);

  let metaFoodOptionsKeys = Object.keys(metaFoodOptions).sort();
  str = '';

  for(var i=0; i<metaFoodOptionsKeys.length; i++) {
    str += "["+metaFoodOptionsKeys[i]+"]("+metaFoodOptions[metaFoodOptionsKeys[i]]+")\n";
  }

  richEmbed.addField("3rd Party Food Deliveries", str, true);

  richEmbed.addField("\u200b", "Want something added to the list? Let <@!154572358051430400> know!");

  return richEmbed;
}

/**************************************************************
      Bot Status Message - Fetching random online member
***************************************************************/

function updateBotStatus(eChannel) {
  eChannel.guild.fetchMembers().then(function(guild){
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
                Onload Channel Check / Create
***************************************************************/

async function channelCheck(guild) {
  // Category Check
  let channelCategoryExists = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category");
  let channelCategoryID;

  if( channelCategoryExists === null )
    await guild.createChannel(channelCategoryName, "category").then(async function(newChannel){
      channelCategoryID = await newChannel.id;
    });
  else
    channelCategoryID = guild.channels.find(channel => channel.name == channelCategoryName && channel.type == "category").id;

  // Interest List Channel Check
  if( guild.id != happyMealServerID ) {
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
  }

  // Event Channel Check
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

  return {
    channel: channel,
    eventChannel: eventChannel
  }
}

/******************************
          Objects
*******************************/

function InterestList() {
  var self = this;

  self.getInterestList = async function(channel) {

    raids = {
      'Levi': [],
      'PLevi': [],
      'EoW': [],
      'SoS': [],
      'Wish': [],
      'Riven': [],
      'Scourge': [],
    };

    await pool.query("SELECT * FROM interest_list WHERE server_id = ? ORDER BY FIELD(raid, 'levi', 'plevi', 'eow', 'sos', 'wish', 'riven', 'scourge')", [channel.guild.id])
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
        .setDescription(config.interestListHelpTxt);

      channel.send( richEmbed );

      // Interest list
      for ( var raid in raids ) {
        if ( Object.keys(raids[raid]).length > 0 ) {
          richEmbed = new Discord.RichEmbed()
          .setTitle(config.raidNameMapping[raid] + " - !sub " + raid)
          .setColor(config.raidColorMapping[raid])
          .setThumbnail(config.raidImgs[raid])
          .setDescription( self.printUsernameRemarks( raids[raid] ) );

          if(config.raidGuides[raid])
            richEmbed.setURL(config.raidGuides[raid]);

          channel.send( richEmbed );
        }
      }
    });
  }

  self.sub = function(raid, player, comment, message) {

    username = player.nickname ? player.nickname : player.user.username;

    pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
    .then(function(results){
      return pool.query("INSERT into interest_list SET ?", {raid: raid, username: username, user_id: player.id, comment: comment, server_id: message.guild.id, date_added: moment().format('YYYY-M-D')});
    }).then(function(results){
      self.updateInterestList(raid);
    });
  }

  self.unsub = function(raid, player, message) {
    pool.query("DELETE FROM interest_list where raid = ? AND user_id = ? AND server_id = ?", [raid, player.id, message.guild.id])
    .then(function(results){
      self.updateInterestList(raid);
    });
  }

  self.unsubAll = function(raid, message) {
    pool.query("DELETE FROM interest_list where raid = ? AND server_id = ?", [raid, message.guild.id])
    .then(function(results){
      self.updateInterestList(raid);
    });
  }

  self.updateInterestList = function(raid) {

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
          .setThumbnail(config.raidImgs[raid])
          .setDescription( self.printUsernameRemarks(r) );

          if(config.raidGuides[raid])
            richEmbed.setURL(config.raidGuides[raid]);

          if( message_id == '' ) {
            self.getInterestList(channel);
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

  self.printUsernameRemarks = function( raid ) {
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
}

function Event() {
  var self = this;


  self.autoExpireEvent = async function() {
    // update any expired events
    return await pool.query("UPDATE event SET message_id = '', status = 'deleted' WHERE status  = 'active' AND event_date + INTERVAL 3 HOUR < NOW()");
  }

  /******************************
    Resend Missing Event Messages
  *******************************/

  self.detectMissing = async function(eChannel) {
    console.log(timestampPrefix() + "Checking for missing events for server: " + eChannel.guild.name);

    await eChannel.fetchMessages().then(async function(messages){
      let current_event_messages = messages.filter(function(msg){
        return msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('Event ID:')
      });

      let current_event_messages_ids = current_event_messages.map(function(msg){
        return msg.id;
      });

      await pool.query("SELECT * FROM event WHERE server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) ORDER BY event_date IS NULL DESC, event_date ASC", [eChannel.guild.id])
      .then(async function(results){

        var rows = JSON.parse(JSON.stringify(results));

        if( rows.length > 0 && rows.length > current_event_messages_ids.length ) {

          for( var i=0; i<rows.length; i++ ) {

            let event = rows[i];

            if( current_event_messages_ids.includes( event.message_id ) == false ) {

              console.log( timestampPrefix() + 'Event ' + event.id + " not found for server: " + eChannel.guild.name);

              // If event in DB not found in channel - create it
              await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
              .then(async function(results){
                eventInfo = self.getEventInfo(event, results);

                await eChannel.send( eventInfo.richEmbed ).then(async function(message){

                  await pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [message.id, event.event_id]);

                  if( eventInfo.confirmedCount <= maxConfirmed )
                    await message.react('🆗');
                  await message.react('🤔');
                  await message.react('⛔');
                });
              });
            }
          }
        }
      });
    });
  }

  /******************************
      Reorder Event Messages
  *******************************/

  self.reorder = async function(eChannel) {

    await self.detectMissing(eChannel);

    console.log(timestampPrefix() + "Reordering events channel for server: " + eChannel.guild.name);

    await eChannel.fetchMessages().then(async function(messages){

      let current_event_messages = messages.filter(function(msg){
        return msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('Event ID:')
      });

      let current_event_messages_ids = current_event_messages.map(function(msg){
        return msg.id;
      });

      current_event_messages_ids = current_event_messages_ids.sort();

      if( current_event_messages_ids.length > 0 ) {
        // Get active events
        await pool.query("SELECT * FROM event WHERE server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) ORDER BY event_date IS NULL DESC, event_date ASC", [eChannel.guild.id])
        .then(async function(results){
          var rows = JSON.parse(JSON.stringify(results));

          for(var i = 0; i < rows.length; i++) {

            let event = rows[i];

            // If over subscribed
            if( eChannel.guild.id == sgeServerID ) {
              maxConfirmed = 6;

              await pool.query("SELECT user_id FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? AND type = 'confirmed' ORDER BY event_signup.date_added ASC LIMIT ?, 999", [event.event_id, maxConfirmed])
              .then(async function(results){
                if( results.length > 0 ) {
                  user_ids = results.map(function(result){ return result.user_id; });

                  if( user_ids.length > 0 ) {
                    await pool.query("UPDATE event_signup SET type='reserve' WHERE user_id IN (?) AND type='confirmed'", [user_ids]);

                    // Update Msg
                    await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
                    .then(async function(results){
                      eventInfo = self.getEventInfo(event, results);

                      await eChannel.fetchMessage(event.message_id)
                      .then(async function(msg){
                        msg.edit( eventInfo.richEmbed )
                        .then(async function(message){
                          await message.clearReactions().then(async function(message){

                            maxConfirmed = (eChannel.guild.id == sgeServerID) ? 6 : 999;

                            if( results.filter(row => row.type == "confirmed").length < maxConfirmed )
                              await message.react('🆗');
                            await message.react('🤔');
                            await message.react('⛔');
                          });
                        });
                      });
                    });
                  }
                }
              });
            }

            await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
            .then(async function(results){
              eventInfo = self.getEventInfo(event, results);
              curr_event_message = current_event_messages.filter(e => { return e.id === event.message_id }).values().next().value;
              curr_event_message_id_to_edit = current_event_messages_ids.shift();

              if( curr_event_message_id_to_edit ) {
                await eChannel.fetchMessage(curr_event_message_id_to_edit)
                .then(async function(msg){

                  if( msg.embeds[0].title != eventInfo.richEmbed.title ){
                    console.log( timestampPrefix() + "Reordered event ID: " + event.event_id + " from message ID: " + event.message_id + " to " + curr_event_message_id_to_edit + " for server: " + eChannel.guild.name);
                    await pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [curr_event_message_id_to_edit, event.event_id]);

                    msg.edit( eventInfo.richEmbed )
                    .then(async function(message){
                      await message.clearReactions().then(async function(message){

                        maxConfirmed = (eChannel.guild.id == sgeServerID) ? 6 : 999;

                        if( results.filter(row => row.type == "confirmed").length < maxConfirmed )
                          await message.react('🆗');
                        await message.react('🤔');
                        await message.react('⛔');
                      });
                    });
                  }
                });
              }
            });
          }

          // delete any ids that remains
          if( current_event_messages_ids.length > 0 ) {
            for(var i=0;i<current_event_messages_ids.length;i++) {
              await eChannel.fetchMessage(current_event_messages_ids[i])
              .then(async function(msg){
                console.log( timestampPrefix() + "Deleting message ID: " + current_event_messages_ids[i] + " with title: " + msg.embeds[0].title );
                msg.delete();
              })
              .catch(function(e){
                console.log(e);
              });
            }
          };
        })
      }
      else
        console.log( timestampPrefix() + "No active events to reorder" );

      // update any expired events
      await self.autoExpireEvent();
      console.log(timestampPrefix() + "Finished reordering events channel for server: " + eChannel.guild.name);
    });
  }

  /******************************
            Create Event
  *******************************/

  self.create = async function(message, eventName, eventDescription) {

    await eventChannel.guild.fetchMember(message.author).then(async function(member){

      creator = member.nickname ? member.nickname : member.user.username;
      event_date_string = getEventDatetimeString(eventName);
      event_date = isEventDatetimeValid(event_date_string) ? isEventDatetimeValid(event_date_string) : null;

      // Future Check
      if( event_date ) {
        e = moment( event_date, 'YYYY-MM-DD HH:mm:ss' ).format(moment().year()+'-MM-DD');

        if( moment().diff( e, 'days' ) > 0 ) {
          event_date = moment( event_date, 'YYYY-MM-DD HH:mm:ss' ).add(1, 'years').format('YYYY-MM-DD HH:mm:ss')
        }
      }

      await pool.query("INSERT into event SET ?",
      { server_id: serverID,
        event_name: eventName,
        event_description: eventDescription,
        event_date: event_date,
        created_by: message.author.id,
        created_by_username: creator,
        date_added: moment().format('YYYY-M-D HH:mm:ss')
      })
      .then(async function(result){

        await pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [result.insertId, serverID])
        .then(async function(results){

          var rows = JSON.parse(JSON.stringify(results));
          let event = rows[0];

          await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
          .then(async function(results){

            eventInfo = self.getEventInfo(event, results);

            await eventChannel.send( eventInfo.richEmbed ).then(async function(message){

              await pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [message.id, event.event_id]);

              if( eventInfo.confirmedCount <= maxConfirmed )
                await message.react('🆗');
              await message.react('🤔');
              await message.react('⛔');
            });
          });
        });

        return result;
      }).then(async function(result){
        await eventChannel.guild.fetchMember(message.author).then(async function(member){
          await self.sub(message, result.insertId, member);
        });
      });
    }).then(function(){
      self.reorder(eventChannel);
    });
  };

  /******************************
        Update / Edit Event
  *******************************/

  self.update = async function(message, eventID, eventName, eventDescription) {
    // Check if event belong to server before proceeding
    await pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, message.guild.id])
    .then(async function(results){
      if( results.length > 0 ) {
        await pool.query("SELECT * FROM event WHERE event_id = ?", [eventID])
        .then(async function(results){
          var rows = JSON.parse(JSON.stringify(results));

          if ( rows[0] ) {
            event = rows[0];
          }

          if ( isAdmin || event.created_by == message.author.id ) {
            event_date_string = getEventDatetimeString(eventName);
            event_date = isEventDatetimeValid(event_date_string) ? isEventDatetimeValid(event_date_string) : null;

            // Future Check
            if( event_date ) {
              e = moment( event_date, 'YYYY-MM-DD HH:mm:ss' ).format(moment().year()+'-MM-DD');

              if( moment().diff( e, 'days' ) > 0 ) {
                event_date = moment( event_date, 'YYYY-MM-DD HH:mm:ss' ).add(1, 'years').format('YYYY-MM-DD HH:mm:ss')
              }
            }
            console.log( timestampPrefix() + "Updating event ID: " + eventID );

            return await pool.query("UPDATE event SET event_name = ?, event_description = ?, event_date = ? WHERE event_id = ?", [eventName, eventDescription, event_date, eventID]);
          }

        }).then(function(){
          self.updateEventMessage(eventID);
        }).then(function(){
          self.reorder(eventChannel);
        });
      }
      else {
        console.log( timestampPrefix() + 'Event update failed for event ID: ' + eventID + ' in channel ' + message.guild.name );
      }
    });
  }

  /******************************
            Delete Event
  *******************************/

  self.remove = async function(message, eventID, author) {
    // Check if event belong to server before proceeding
    pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, message.guild.id])
    .then(function(results){
      if( results.length > 0 ) {
        pool.query("SELECT * FROM event WHERE event_id = ? AND status = 'active'", [eventID])
        .then(function(results){
          var rows = JSON.parse(JSON.stringify(results));

          if ( rows[0] ) {
            event = rows[0];
          }
          else
            return;

          if ( isAdmin || event.created_by == author.id ) {
            console.log( timestampPrefix() + 'Deleted Event ID: ' + eventID + ' "' + event.event_name + '"');

            eventChannel.fetchMessage(event.message_id)
            .then(function(message){
              message.delete();
            });
            return pool.query("UPDATE event SET status = 'deleted' WHERE event_id = ?", [eventID]);
          }
        });
      }
      else {
        console.log( timestampPrefix() + 'Event deletion failed for event ID: ' + eventID + ' in channel ' + message.guild.name );
      }
    });
  }

  /******************************
        Get & Refresh Event
  *******************************/

  self.getEvents = async function(eventChannel) {

    clear(eventChannel);

    var richEmbed = new Discord.RichEmbed()
      .setTitle("Instructions")
      .setColor("#DB9834")
      .setDescription("Sign up to raids by reacting :ok: to __confirm__ :thinking: to __reserve__ :no_entry: to __withdraw__");

    richEmbed.addField(
      "Quick Commands",
      '__Create event__ \n!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"\n\n__Please follow the standard format__ \n"Date Time [Levi/EoW/SoS/LW/SoTP] Event Title" "Optional Description"\n\n__Full command list__ \n!event help');

    richEmbed.addField(
      "\u200b",
      '[:link: Subscribe to receive push notifications of new events](https://sgelites.com/events)');

    eventChannel.send( "If you're unable to see anything in this channel, make sure User Settings > Text & Images > Link Preview is checked." );
    eventChannel.send( richEmbed );

    pool.query("SELECT * FROM event WHERE server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) ORDER BY event_date IS NULL DESC, event_date ASC", [eventChannel.guild.id])
    .then(async function(results){

      var rows = JSON.parse(JSON.stringify(results));

      for(var i = 0; i < rows.length; i++) {

        let event = rows[i];

        await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
        .then(async function(results){

          eventInfo = self.getEventInfo(event, results);

          console.log( timestampPrefix() + 'Printing Event ID: ' + event.event_id + ' - ' + event.event_name + '" by: ' + event.created_by_username + " for Server: " + eventChannel.guild.name );

          await eventChannel.send( eventInfo.richEmbed ).then(async function(message){

            if( results.filter(row => row.type == "confirmed").length < maxConfirmed )
              await message.react('🆗');
            await message.react('🤔');
            await message.react('⛔');

            client.fetchUser(event.created_by).then(function(user){
              eventChannel.guild.fetchMember(user).then(function(member){
                creator = member.nickname ? member.nickname : member.user.username;
                pool.query("UPDATE event SET message_id = ?, created_by_username = ? WHERE event_id = ?", [message.id, creator, event.event_id]);
              })
            });
          });
        });
      }
    });
  }

  /******************************
        Unsub from Event
  *******************************/

  self.unsub = function(message, eventID, player) {
    // Check if event belong to server before proceeding
    pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, message.guild.id])
    .then(function(results){
      if( results.length > 0 ) {
        console.log( timestampPrefix() + "Unsubbed from event ID: " + eventID );
        pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
        .then(function(results){
          self.updateEventMessage(eventID);
        });
      }
      else {
        console.log( timestampPrefix() + 'Event withdraw failed for event ID: ' + eventID + ' in channel ' + message.guild.name );
      }
    });
  }

  self.removeFromEvent = function(message, eventID, user, player) {
    pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows[0].created_by == user.id || isAdmin ) {
        console.log( timestampPrefix() + "Removed from event ID: " + eventID );
        self.unsub(message, eventID, player);
      }
    });
  }

  /******************************
        Join / Sub Event
  *******************************/

  self.sub = function(message, eventID, player, type="confirmed", addedByUser="") {
    // Check if event belong to server before proceeding
    pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, message.guild.id])
    .then(function(results){
      if( results.length > 0 ) {
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
          self.updateEventMessage(eventID);
        });
      }
      else {
        console.log( timestampPrefix() + 'Event join failed for event ID: ' + eventID + ' in channel ' + message.guild.name );
      }
    });
  }

  self.add2Event = function(message, eventID, type, user, player) {
    pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows[0].created_by == user.id || isAdmin ) {
        console.log( timestampPrefix() + "Added to event ID: " + eventID );
        self.sub(message, eventID, player, type, user);
      }
    });
  }

  /******************************
        Add Comment to Sub
  *******************************/

  self.addComment = function(message, eventID, user, comment) {
    // Check if event belong to server before proceeding
    pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, message.guild.id])
    .then(function(results){
      if( results.length > 0 ) {
        pool.query("UPDATE event_signup SET comment = ? WHERE event_id = ? AND user_id = ?", [comment, eventID, user.id])
        .then(function(results){
          self.updateEventMessage(eventID);
        });
      }
      else {
        console.log( timestampPrefix() + 'Add comment failed for event ID: ' + eventID + ' in channel ' + message.guild.name );
      }
    });
  }

  /******************************
       Refresh Event Msg
  *******************************/

  self.updateEventMessage = async function(eventID) {
    await pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [eventID, serverID])
    .then(function(results){
      var event = JSON.parse(JSON.stringify(results));
      return event;
    })
    .then(async function(event){
      if( event.length > 0 ) {
        await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? AND event.server_id = ? ORDER BY event_signup.date_added ASC", [eventID, serverID])
        .then(async function(results){

          if( event[0].message_id > 0 ) {

            eventInfo = self.getEventInfo(event[0], results);

            await eventChannel.fetchMessage(event[0].message_id)
            .then(async function(message){
              await message.clearReactions().then(async function(message){
                await message.edit( eventInfo.richEmbed ).then(async function(message){
                  if( results.filter(row => row.type == "confirmed").length < maxConfirmed )
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

  /******************************
     Get Msg Content of Event
  *******************************/

  self.getEventInfo = function(event, signUps) {
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

    richEmbed.addField("Confirmed" + (confirmedCount-1==maxConfirmed?" [Full]":""), confirmed, true);
    richEmbed.addField("Reserve", reserve, true);


    if (creator)
      richEmbed.addField("Created By", creator);

    return {
      richEmbed: richEmbed,
      confirmedCount: confirmedCount,
      reserveCount: reserveCount
    };
  }

  /******************************
          Search Events
  *******************************/
  self.search = function(searchStr, player) {
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

          eventInfo = self.getEventInfo(event, results);

          player.send(eventInfo.richEmbed);
        });
      }
    });
  }

  /******************************
     Ping Signups of Events
  *******************************/
  self.pingEventSignups = function(eventID, author) {
    pool.query("SELECT * FROM event_signup LEFT JOIN event ON event_signup.event_id = event.event_id WHERE event_signup.event_id = ? AND event.server_id = ?", [eventID, serverID])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));
      let pinger = author.nickname ? author.nickname : author.user.username;

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
              signup.send("This is an alert by " + pinger + " / <@"+author.id+"> regarding event, __" + event_name + "__");
            });
          });
        }
      }
    });
  }

  self.parseEventNameDescription = function(args) {
    let recompose = args.slice(1, args.length).join(" ");
    let indices = []; // find the indices of the quotation marks

    for (var i in recompose) {
        let char = recompose[i];
      if (char === '"') {
        indices.push(i);
      }
    }

    let eventName = '';
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
      eventName = args.slice(1, args.length).join(" ");
      eventName = eventName.replace(/"/g,'');
    }

    return {
      eventName: eventName,
      eventDescription: eventDescription
    };
  }

  self.signupAlert = function(eventID, signup, type) {
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
}

client.login(config.token);
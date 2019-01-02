/******************************
  Variables & Libs
*******************************/

const config = require('./config').production;
const pool = config.getPool();
const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();
const raidEvent = new Event();
const interestList = new InterestList();
const pvpList = new PVPList();
const axios = require('axios');
const Traveler = require('the-traveler').default;
const traveler = new Traveler({
  apikey: config.bungieAPIKey,
  userAgent: 'alvinyeoh', //used to identify your request to the API
  debug: false
});
const eventDatetimeFormat = 'DD MMM h:mmA';

let isAdmin = false;
let isClanMember = false;
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
  Channels
*******************************/

const channelCategoryName = "Looking for Group";
const channelName = "raid_newbies_signup"; // no spaces all lower case
const eventChannelName = "raid_lfg"; // no spaces all lower case
const pvpChannelName = "pvp_lfg"; // no spaces all lower case
let channel;
let eventChannel;
let pvpChannel;
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
    updateBotStatus();
  }, 30000);

  setInterval(function(){
    raidEvent.reorder(); // reorder event channel every hour
  }, 3600000);
});

client.on("guildCreate", async function(guild) {
    console.log(timestampPrefix() + "Joined a new guild: " + guild.name);
    serverID = guild.id;
    await channelCheck(guild);
});

client.on('messageReactionAdd', async function(reaction, user) {

  if ( reaction.message.guild === null ) return; // Disallow DM
  if ( user.bot ) return;

  console.log( timestampPrefix() + reaction.emoji + " By: " + user.username + " on Message ID: " + reaction.message.id );

  serverID = reaction.message.guild.id;

  await channelCheck(reaction.message.guild);

  if( reaction.message.channel.name != eventChannelName ) return;

  eventName = reaction.message.embeds[0].message.embeds[0].title ? reaction.message.embeds[0].message.embeds[0].title : "";

  if( eventName ) {
    message_id = reaction.message.id;
    eventID = await pool.query("SELECT * FROM event WHERE message_id = ? AND server_id = ? LIMIT 1", [message_id, serverID]).then(function(results){
      return results[0].event_id;
    })
    .error(function(e){
      return 0;
    });

    if( eventID ) {
      if(reaction.emoji.name === "🆗") {
        reaction.message.guild.fetchMember(user).then(function(guildMember){
          raidEvent.sub(eventID, guildMember, "confirmed", guildMember);
        });
      }

      else if(reaction.emoji.name === "🤔") {
        reaction.message.guild.fetchMember(user).then(function(guildMember){
          raidEvent.sub(eventID, guildMember, "reserve", guildMember);
        });
      }

      else if(reaction.emoji.name === "⛔") {
        raidEvent.unsub(eventID, user);
      }

      else if(reaction.emoji.name === "❌") {
        raidEvent.remove(eventID, user);
      }

      else if(reaction.emoji.name === "👋") {
        raidEvent.pingEventSignups(eventID);
      }
    }
  }
});

client.on("message", async function(message) {

  if ( message.author.bot ) return;
  if ( message.channel.name != eventChannel.name && message.channel.name != channel.name && message.channel.name != pvpChannel.name ) return;
  if ( message.guild === null ) return; // Disallow DM

  console.log( timestampPrefix() + "Message: " + message.content + " By: " + message.author.username );

  message.content = message.content.replace(/“/g, '"').replace(/”/g, '"');

  isAdmin = (message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") || Object.keys(config.adminIDs).includes(message.member.id) || Object.keys(config.sherpaIDs).includes(message.member.id)) ? true : false;
  isClanMember = (message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") || message.member.roles.find(roles => roles.name === "Clan 1") || message.member.roles.find(roles => roles.name === "Clan 2")) ? true : false;
  serverID = message.guild.id;

  await channelCheck(message.guild);

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  /****************************
        #raid_lfg channel
  *****************************/

  if( message.channel == eventChannel ) {
    if ( command === "event" ) {

      switch ( args[0] ) {

        // !event create "Levi Raid 20 Feb 9PM" "Bring raid banners!"
        case "create":
          if ( args.length > 1 ) {

            let eventName = raidEvent.parseEventNameDescription(args).eventName;
            let eventDescription = raidEvent.parseEventNameDescription(args).eventDescription;
            let event_date_string = getEventDatetimeString(eventName);

            if( isEventDatetimeValid(event_date_string) === false || eventName.length < 7 ) {
              message.author.send('Create event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
              break;
            }

            raidEvent.create(message.author, eventName, eventDescription);
          }

          break;

        // Restricted to message author or admin
        // !event delete event_id
        case "delete":
          if ( args.length > 1 ) {
            let eventID = args[1];
            raidEvent.remove(eventID, message.author);
          }

          break;

        // Restricted to message author or admin
        // !event edit event_id "event_name" "event_description"
        case "edit":
          if ( args.length > 1 ) {
            let eventID = parseInt(args[1]);

            if ( eventID ) {
              let eventName = raidEvent.parseEventNameDescription(args).eventName;
              let eventDescription = raidEvent.parseEventNameDescription(args).eventDescription;
              let event_date_string = getEventDatetimeString(eventName);

              if( isEventDatetimeValid(event_date_string) === false || eventName.length < 7 ) {
                message.author.send('Edit event failed with command: ' + message.content + '\n' + 'Please follow the format: ' + '!event edit event_id "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"');
                break;
              }

              raidEvent.update(message.author, eventID, eventName, eventDescription);
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
                raidEvent.add2Event(eventID, type, message.member, member);
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
              raidEvent.removeFromEvent(eventID, message.author, player);
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
              raidEvent.addComment( eventID, player, comment, message );
            }
          }

          break;

        // Alternative command to sign up
        // !event sub event_id
        case "sub":
          if ( args.length > 1 ) {
            let eventID = parseInt(args[1]);
            raidEvent.sub(eventID,  message.member);
          }

          break;

        // Alternative command to unsub
        // !event unsub event_id
        case "unsub":
          if ( args.length > 1 ) {
            let eventID = parseInt(args[1]);
            raidEvent.unsub(eventID, message.author);
          }

          break;

        // !event help
        case "help":
          message.author.send(config.eventHelpTxt);
          break;

        case "clear":
          raidEvent.getEvents();
          break;

        default:
          if( smartInputDetect(args[0]) ) {
            raidEvent.search( args[0], message.author );
          }
          break;
      }
    }

    else if ( command === "reorder" ) {
      if ( isAdmin ) {
        raidEvent.reorder();
      }
    }

    else if ( command === "clear" || command === "refresh" ) {
      if ( isAdmin ) {
        raidEvent.getEvents();
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
        interestList.getInterestList(message);
      }
    }
  }

  /****************************
        #pvp_lfg channel
  ****************************/

  if( message.channel == pvpChannel ) {
    if ( command === "pvp" ) {

      switch ( args[0] ) {
        case "sub":
          if( args.length > 1 && message.mentions.users.first() ) {
            let player = message.mentions.users.first();

            message.guild.fetchMember(player).then(function(member){
              pvpList.sub(member);
            });
          }
          else
            pvpList.sub(message.member);

          pvpList.displayList().then(function(){
            message.delete();
          });
          return;

        case "unsub":
          if( args.length > 1 && message.mentions.users.first() ) {
            let player = message.mentions.users.first();

            message.guild.fetchMember(player).then(function(member){
              pvpList.unsub(member);
            })
          }
          else
            pvpList.unsub(message.member);

          pvpList.displayList().then(function(){
            message.delete();
          });
          return;

        case "ping":
          if( args.length > 1 ) {
            let msg = args[1] ? args.slice(1, args.length).join(" ") : "";
            pvpList.pingList(msg, message.member);
          }

          message.delete();
          return;

        case "detailed":
          pvpList.displayList("detailed").then(function(){
            message.delete();
          });
          return;

        case "list":
        default:
          pvpList.displayList().then(function(){
            message.delete();
          });
          return;
      }
    }
  }

  // Delete message after processed to keep channels clean
  if ( message.channel === eventChannel || message.channel === channel )
    message.delete();
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
  return eventName.trim().split(/ +/g).slice(0,3).join(' ');
}

function isEventDatetimeValid(event_date_string) {
  return moment(event_date_string, eventDatetimeFormat).isValid();
}

function updateAllServers() {
  for( var guild of client.guilds.values() ) {
    serverID = guild.id;
    channelCheck(guild);

    setTimeout(function () {
      interestList.getInterestList();
      raidEvent.getEvents();
    }, 1000);
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

  // Event Channel Check
  let pvpChannelExists = guild.channels.find(channel => channel.name == pvpChannelName && channel.type == "text" && channel.parentID == channelCategoryID);

  if( pvpChannelExists === null )
    await guild.createChannel(pvpChannelName, "text").then(async function(newChannel){
      newChannel.setParent( channelCategoryID );
      pvpChannelID = newChannel.id;
      pvpChannel = await client.channels.get(pvpChannelID);
    });
  else {
    pvpChannelID = guild.channels.find(channel => channel.name == pvpChannelName && channel.type == "text" && channel.parentID == channelCategoryID).id;
    pvpChannel = client.channels.get(pvpChannelID);
  }
}

/******************************
          Objects
*******************************/

function PVPList() {
  var self = this;

  self.sub = async function(player, comment='') {
    let username = player.nickname ? player.nickname : player.user.username;

    await pool.query("DELETE FROM pvp_interest_list WHERE server_id = ? AND user_id = ?", [serverID, player.id])
    .then(async function(r){
      await pool.query("INSERT INTO pvp_interest_list SET ?", {server_id: serverID, username: username, user_id: player.id, date_added: moment().format('YYYY-MM-DD')})
      .then(function(r){
        console.log( timestampPrefix() + username + " subbed for PVP List" );
      });
    });
  }

  self.unsub = async function(player, comment='') {
    let username = player.nickname ? player.nickname : player.user.username;
    let user_id = player.id;

    await pool.query("DELETE FROM pvp_interest_list WHERE server_id = ? AND user_id = ?", [serverID, player.id]).then(function(r){
      console.log( timestampPrefix() + username + " unsubbed from PVP List" );
    });
  }

  self.displayList = async function(type='simple') {
    await self.clearBotMessages(pvpChannel).then(function(){
      pvpChannel.startTyping();
      self.getList(type).then(function(){
        pvpChannel.stopTyping();
      });
    })
  }

  self.clearBotMessages = async function(channel) {
    let c = channel;

    await channel.fetchMessages({limit: 99}).then(function(messages){
      messages = messages.filter(m => { return m.author.bot == true && (m.embeds.length == 0 || m.embeds[0].author.name.includes('PvP Interest List')) });
      c.bulkDelete(messages);
    })
    .catch(function(e){
      console.log(e);
    });
  }

  self.getList = async function(type="simple") {
    await pool.query("SELECT * FROM pvp_interest_list WHERE server_id = ? ORDER BY username ASC", [serverID]).then(async function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows.length > 0 ) {

        if(type==='simple') {

          let playersName = '';

          for ( var i=0; i<rows.length; i++ ) {
            let username = rows[i].username;
            playersName += "• `" + username+"`\n";
          }

          var richEmbed = new Discord.RichEmbed()
            .setColor("#DC143C")
            .setAuthor("PvP Interest List (Simple)", "https://pbs.twimg.com/media/DL5Aj0HX4AgvJMv.jpg")
            .setDescription(playersName)
            .setTimestamp();

          richEmbed.addField("\u200b\nCommands", "`Show list - !pvp or !pvp detailed\nSub - !pvp sub or !pvp sub @user to sub someone\nUnsub - !pvp unsub or !pvp unsub @user to unsub someone\nPing list - !pvp ping your message here`");
          console.log( timestampPrefix() + "Displaying Detailed PVP List" );
          await pvpChannel.send(richEmbed);
        }
        else {
          await self.getPVPStats(rows).then(async function(data){
            var richEmbed = new Discord.RichEmbed()
              .setColor("#DC143C")
              .setAuthor("PvP Interest List (Detailed)", "https://pbs.twimg.com/media/DL5Aj0HX4AgvJMv.jpg")
              .setTimestamp();

            let playersName = '';
            let playersGlory = '';
            let playersStat = '';

            if( data.length > 0 ) {
              for( var i=0;i<data.length;i++ ) {
                let description = '';
                description += data[i].glory !== '' ? '**Glory:** ' + data[i].glory+'\n' : '';
                description += (data[i].kd !== '' && data[i].kad !== '') ? '**KD:** ' + data[i].kd +' **KAD:** ' + data[i].kad + '\n' : '';
                description += description === '' ? 'n/a' : '';

                richEmbed.addField(data[i].username, description, true);

                // Fill empty columns
                if( i+1 == data.length ) {
                  let emptyColumn = 3 - (data.length % 3);
                  if( emptyColumn > 0 ) {
                    while( emptyColumn != 0 ) {
                      richEmbed.addField("\u200b", "\u200b", true);
                      emptyColumn--;
                    }
                  }
                }

                playersName += data[i].username + '\n';
                playersGlory += data[i].glory !== '' ? 'Glory: ' + data[i].glory+'\n' : '-\n';
                playersStat += (data[i].kd === '' || data[i].kd === '') ? '-\n' : data[i].kd + ' / ' + data[i].kad + '\n';
              }
            }

            richEmbed.addField("\u200b\nCommands", "`Show list - !pvp or !pvp detailed\nSub - !pvp sub or !pvp sub @user to sub someone\nUnsub - !pvp unsub or !pvp unsub @user to unsub someone\nPing list - !pvp ping your message here`");
            console.log( timestampPrefix() + "Displaying Detailed PVP List" );
            await pvpChannel.send(richEmbed);
          });
        }
      }
      else {
        await pvpChannel.send("Nobody is on the PVP interest list :slight_frown:");
      }
    })
    .catch(function(e){
      console.log(e);
    });
    return;
  }

  self.getPVPStats = async function(rows) {
    const glory_hash = 2000925172; // competitive
    const valor_hash = 3882308435; // quickplay
    const infamy_hash = 2772425241; // gambit
    const membershipType = 4;

    let data = [];

    for ( var i=0; i<rows.length; i++ ) {
      let username = rows[i].username;
      let userID = rows[i].user_id;
      let vPt = '';
      let gPt = '';
      let iPt = '';
      let kad = '';
      let kda = '';
      let kd = '';
      let lastLogin = '';

      await traveler.searchDestinyPlayer(membershipType, encodeURIComponent(username)).then(async function(response){

        if( response.Response[0] && response.Response[0].membershipId ) {
          let membershipId = response.Response[0].membershipId;

          await traveler.getProfile(membershipType, membershipId, {components: ['100', '202']}).then(async function(r){
            if( r.Response.characterProgressions.data && await Object.keys(r.Response.characterProgressions.data).length > 0 ) {
              let characterID = await Object.keys(r.Response.characterProgressions.data).shift();

              await axios.get('https://www.bungie.net/Platform/Destiny2/'+membershipType+'/Account/'+membershipId+'/Stats/', { headers: { 'X-API-Key': config.bungieAPIKey } })
              .then(async function(res){
                if( res.status == 200 ) {
                  kad = await res.data.Response.mergedAllCharacters.results.allPvP.allTime.efficiency.basic.displayValue;
                  kda = await res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsAssists.basic.displayValue;
                  kd = await res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsRatio.basic.displayValue;
                }
              })
              .catch(function(e){
                console.log(e);
              });

              iPt = await r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress : 0;
              vPt = await r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress : 0;
              gPt = await r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress : 0;
              lastLogin = r.Response.profile.data.dateLastPlayed;
              lastLogin = moment(lastLogin.substr(0,10), "YYYY-MM-DD").isValid() ? moment(lastLogin.substr(0,10), "YYYY-MM-DD").format("D MMM YYYY") : '';
            }
          });
        }
      });

      data.push({
        username: username,
        kda: kda,
        kad: kad,
        kd: kd,
        glory: gPt,
        valor: vPt,
        infamy: iPt,
        lastLogin: lastLogin
      });
    }

    return data;
  }

  self.pingList = function(msg, creator) {
    pool.query("SELECT * FROM pvp_interest_list WHERE server_id = ? ORDER BY username ASC", [serverID]).then(function(results){
      let playerIDs = '';
      var rows = JSON.parse(JSON.stringify(results));

      if( rows.length > 0 ) {
        for(var i=0;i<rows.length;i++) {
          playerIDs += "<@!"+rows[i].user_id+"> ";
        }

        let creator_name = creator.nickname ? creator.nickname : creator.user.username;

        var richEmbed = new Discord.RichEmbed()
          .setColor("#DC143C")
          .setAuthor(creator_name, creator.user.avatarURL)
          .setDescription(msg)
          .setTimestamp();

        richEmbed.addField(":wave:", playerIDs);

        pvpChannel.send(richEmbed);
      }
    });
  }
}

function InterestList() {
  var self = this;

  self.getInterestList = function() {

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
            self.getInterestList();
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

  /******************************
      Reorder Event Messages
  *******************************/

  self.reorder = async function() {
    console.log(timestampPrefix() + "Reordering events channel");

    await eventChannel.fetchMessages().then(async function(messages){

      let current_event_messages = messages.filter(function(msg){
        return msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('Event ID:')
      });

      let current_event_messages_ids = current_event_messages.map(function(msg){
        return msg.id;
      });

      current_event_messages_ids = current_event_messages_ids.sort();

      if( current_event_messages_ids.length > 0 ) {
        await pool.query("SELECT * FROM event WHERE server_id = ? AND status = 'active' AND ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() ) ORDER BY event_date IS NULL DESC, event_date ASC", [serverID])
        .then(async function(results){
          var rows = JSON.parse(JSON.stringify(results));

          for(var i = 0; i < rows.length; i++) {

            let event = rows[i];

            await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
            .then(async function(results){
              eventInfo = self.getEventInfo(event, results);
              curr_event_message = current_event_messages.filter(e => { return e.id === event.message_id }).values().next().value;
              curr_event_message_id_to_edit = current_event_messages_ids.shift();

              await eventChannel.fetchMessage(curr_event_message_id_to_edit)
              .then(async function(msg){
                if( msg.embeds[0].title != eventInfo.richEmbed.title ){
                  console.log( timestampPrefix() + "Reordered event ID: " + event.event_id + " from message ID: " + event.message_id + " to " + curr_event_message_id_to_edit );
                  await pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [curr_event_message_id_to_edit, event.event_id]);

                  msg.edit( eventInfo.richEmbed )
                  .then(async function(message){
                    await message.clearReactions().then(async function(message){
                      if( results.filter(row => row.type == "confirmed").length < 6 )
                        await message.react('🆗');
                      await message.react('🤔');
                      await message.react('⛔');
                    });
                  });
                }
              });
            });
          }

          // delete any ids that remains
          if( current_event_messages_ids.length > 0 ) {
            for(var i=0;i<current_event_messages_ids.length;i++) {
              await eventChannel.fetchMessage(current_event_messages_ids[i])
              .then(async function(msg){
                console.log( timestampPrefix() + "Deleting message ID: " + current_event_messages_ids[i] + " with title: " + msg.embeds[0].title );
                msg.delete();
              });
            }
          }
        })
      }
      else
        console.log( timestampPrefix() + "No active events to reorder" );
    });
  }

  /******************************
            Create Event
  *******************************/

  self.create = async function(author, eventName, eventDescription) {

    await eventChannel.guild.fetchMember(author).then(async function(member){

      creator = member.nickname ? member.nickname : member.user.username;
      event_date_string = getEventDatetimeString(eventName);
      event_date = isEventDatetimeValid(event_date_string) ? moment( event_date_string, eventDatetimeFormat ).format(moment().year()+'-MM-DD HH:mm:ss') : null;

      // Future Check
      if( event_date ) {
        e = moment( event_date_string, eventDatetimeFormat ).format(moment().year()+'-MM-DD');

        if( moment().diff( e, 'days' ) > 0 ) {
          event_date = moment( event_date, 'YYYY-MM-DD HH:mm:ss' ).add(1, 'years').format('YYYY-MM-DD HH:mm:ss')
        }
      }

      await pool.query("INSERT into event SET ?",
      { server_id: serverID,
        event_name: eventName,
        event_description: eventDescription,
        event_date: event_date,
        created_by: author.id,
        created_by_username: creator,
        date_added: moment().format('YYYY-M-D HH:mm:ss')
      })
      .then(async function(result){

        await eventChannel.guild.fetchMember(author).then(async function(member){
          await self.sub(result.insertId, member);
        });

        await pool.query("SELECT * FROM event WHERE event_id = ? AND server_id = ?", [result.insertId, serverID])
        .then(async function(results){

          var rows = JSON.parse(JSON.stringify(results));
          let event = rows[0];

          await pool.query("SELECT * FROM event_signup LEFT JOIN event on event_signup.event_id = event.event_id WHERE event_signup.event_id = ? ORDER BY event_signup.date_added ASC", [event.event_id])
          .then(async function(results){

            eventInfo = self.getEventInfo(event, results);

            await eventChannel.send( eventInfo.richEmbed ).then(async function(message){

              await pool.query("UPDATE event SET message_id = ? WHERE event_id = ?", [message.id, event.event_id]);

              if( eventInfo.confirmedCount <= 6 )
                await message.react('🆗');
              await message.react('🤔');
              await message.react('⛔');
            });
          });
        });
      });
    }).then(function(){
      self.reorder();
    });
  };

  /******************************
        Update / Edit Event
  *******************************/

  self.update = async function(author, eventID, eventName, eventDescription) {
    await pool.query("SELECT * FROM event WHERE event_id = ?", [eventID])
    .then(async function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if ( rows[0] ) {
        event = rows[0];
      }

      if ( isAdmin || event.created_by == author.id ) {
        event_date_string = getEventDatetimeString(eventName);
        event_date = isEventDatetimeValid(event_date_string) ? moment( event_date_string, eventDatetimeFormat ).format(moment().year()+'-MM-DD HH:mm:ss') : null;

      // Future Check
      if( event_date ) {
        e = moment( event_date_string, eventDatetimeFormat ).format(moment().year()+'-MM-DD');

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
      self.reorder();
    });
  }

  /******************************
            Delete Event
  *******************************/

  self.remove = async function(eventID, author) {
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

  /******************************
        Get & Refresh Event
  *******************************/

  self.getEvents = function() {

    clear(eventChannel);

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

          eventInfo = self.getEventInfo(event, results);

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

  self.unsub = function(eventID, player) {
    console.log( timestampPrefix() + "Unsubbed from event ID: " + eventID );
    pool.query("DELETE FROM event_signup where event_id = ? AND user_id = ?", [eventID, player.id])
    .then(function(results){
      self.updateEventMessage(eventID);
    });
  }

  self.removeFromEvent = function(eventID, user, player) {
    pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows[0].created_by == user.id || isAdmin ) {
        console.log( timestampPrefix() + "Removed from event ID: " + eventID );
        self.unsub(eventID, player);
      }
    });
  }

  /******************************
        Join / Sub Event
  *******************************/

  self.sub = function(eventID, player, type="confirmed", addedByUser="") {
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

  self.add2Event = function(eventID, type, user, player) {
    pool.query("SELECT * FROM event WHERE event_id = ? ", [eventID])
    .then(function(results){
      var rows = JSON.parse(JSON.stringify(results));

      if( rows[0].created_by == user.id || isAdmin ) {
        console.log( timestampPrefix() + "Added to event ID: " + eventID );
        self.sub(eventID, player, type, user);
      }
    });
  }

  /******************************
        Add Comment to Sub
  *******************************/

  self.addComment = function(eventID, user, comment) {
    pool.query("UPDATE event_signup SET comment = ? WHERE event_id = ? AND user_id = ?", [comment, eventID, user.id])
    .then(function(results){
      self.updateEventMessage(eventID);
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
  self.pingEventSignups = function(eventID) {
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
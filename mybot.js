/******************************
  Variables
*******************************/

var config = require('./config');
var mysql = require('promise-mysql');
var connection;

const mysqlConfig = {
  host     : config.db.host,
  user     : config.db.user,
  password : config.db.password,
  database : config.db.database
}

const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();
const prefix = "!";

let l2lraids = {
  'Levi': [],
  'EoW': [],
  'SoS': [],
  'Wish': []
};

const raidNameMapping = {
  'Levi': 'Leviathan',
  'EoW': 'Eater of Worlds',
  'SoS': 'Spire of Stars',
  'Wish': 'Last Wish'
}

const raidColorMapping = {
  'Levi': 'yaml',
  'EoW': 'yaml',
  'SoS': 'yaml',
  'Wish': 'yaml'
}

const helpTxt = {
  name: 'Commands',
  value: '```' +
  'Subscribe - !L2L levi/eow/sos/wish comments' +
  '\nUnsubscribe - !L2L levi/eow/sos/wish unsub' +
  '\nShow list - !L2L' +
  '\n\ne.g.' +
  '\n!L2L levi Free after 9PM' +
  '\n!L2L sos unsub' +
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

const channelCategoryName = "Looking for group";
const channelName= "looking_2_learn_raid"; // no spaces all lower case
let channelID;
let channel;
let serverID; // also known as guild id

/******************************
  End Variables
*******************************/

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", (message) => {

  if ( message.author.bot )
    return;

  if ( message.member.roles.find(roles => roles.name === "Admin") || message.member.roles.find(roles => roles.name === "Clan Mods") )
    isAdmin = true;

  serverID = message.guild.id;

  channelCheck(message.guild);

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if ( command.toLowerCase() === "l2l" ) {

    if( args[0] === 'clear' && isAdmin === true ) {
        clear();
        getInterestList();
    }
    // Show list
    else if( args[0] === 'show' || !args[0]) {
      getInterestList(message);
    }
    /*
    else if( args[0] == 'help' ) {
      getHelpText(message);
    }
    */
    else {
      let raidInterested = smartInputDetect( args[0] );
      let remarks = args[1] ? args.slice(1, args.length).join(" ") : "";

      for ( var raidName in l2lraids ) {
        if ( raidInterested.toLowerCase() === raidName.toLowerCase() ) {
          /****************
              Mods Only Commands
          ****************/
          // Unsub User
          // e.g. !l2l levi remove xenodus
          if ( args[1] === 'remove') {
            if( args[2] && isAdmin === true ) {
              if( args[2] === '*' )
                unSubAll(raidName, message);
              else
                unSub(raidName, args[2], message);
            }
          }
          // Add User
          // e.g. !l2l levi add xenodus
          else if ( args[1] === 'add') {
            if( args[2] && isAdmin === true ) {
              let remarks = args[3] ? args.slice(3, args.length).join(" ") : "";

              sub(raidName, args[2], remarks, message);
            }
          }
          /****************
               Normal Commands
          ****************/
          // Unsub
          // e.g. !l2l levi unsub
          else if( args[1] === 'unsub' ) {
            unSub(raidName, message.author.username, message);
          }
          // New Interest
          // e.g. !l2l levi Free after 9pm
          else {
            sub(raidName, message.author.username, remarks, message);
          }
        }
      }
    }
  }

  // Delete message after processed
  message.delete();
});

/******************************
  Functions
*******************************/

async function clear() {
    const fetched = await channel.fetchMessages({limit: 99});
    channel.bulkDelete(fetched);
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
}

function sub(raid, username, comment, message) {
  mysql.createConnection(mysqlConfig).then(function(conn){
    connection = conn;
    return conn.query("DELETE FROM interest_list where raid = ? AND username = ? AND server_id = ?", [raid, username, message.guild.id]);
  }).then(function(results){
    return connection.query("INSERT into interest_list SET ?", {raid: raid, username: username, comment: comment, server_id: message.guild.id, date_added: moment().format('YYYY-M-D')});
  }).then(function(results){
    getInterestList();
  });
}

function unSub(raid, username, message) {
  mysql.createConnection(mysqlConfig).then(function(conn){
    return conn.query("DELETE FROM interest_list where raid = ? AND username = ? AND server_id = ?", [raid, username, message.guild.id]);
  }).then(function(results){
    getInterestList();
  });
}

function unSubAll(raid, message) {
  mysql.createConnection(mysqlConfig).then(function(conn){
    return conn.query("DELETE FROM interest_list where raid = ? AND server_id = ?", [raid, message.guild.id]);
  }).then(function(results){
    getInterestList();
  });
}

function getInterestList() {

  mysql.createConnection(mysqlConfig).then(function(conn){
    l2lraids = {
      'Levi': [],
      'EoW': [],
      'SoS': [],
      'Wish': []
    };

    // Last 2 weeks
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
          name: raidNameMapping[raid] + " ("+Object.keys(l2lraids[raid]).length+")",
          value: '```'+raidColorMapping[raid]+'\n' + printUsernameRemarks( l2lraids[raid] ) + '```'
        });

        richEmbed.addField(raidNameMapping[raid] + " ("+Object.keys(l2lraids[raid]).length+")", '```'+raidColorMapping[raid]+'\n' + printUsernameRemarks( l2lraids[raid] ) + '```', true);
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

    clear();
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
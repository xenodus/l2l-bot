const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
const Traveler = require('the-traveler').default;
const axios = require('axios');

const traveler = new Traveler({
    apikey: config.bungieAPIKey,
    userAgent: 'alvinyeoh', //used to identify your request to the API
    debug: false
});

const Discord = require("discord.js");
const client = new Discord.Client();

// Concat with Destiny membershipID
const raidReportURL = 'https://b9bv2wd97h.execute-api.us-west-2.amazonaws.com/prod/api/player/';
const serverID = '372462137651757066';

var raidActivityHash = {
	'levi': [2693136600, 2693136601, 2693136602, 2693136603, 2693136604, 2693136605],
	'levip': [417231112, 757116822, 1685065161, 2449714930, 3446541099, 3879860661],
	'eow': [3089205900],
	'eowp': [809170886],
	'sos': [119944200],
	'sosp': [3213556450],
	'lw': [2122313384],
	'sotp': [548750096]
}

var membershipType = 4;

var interestList = {
	'Levi': [],
	'PLevi': [],
	'EoW': [],
	'SoS': [],
	'Wish': [],
	'Riven': [],
	'Scourge': [],
}

var interestList2Purge = {
	'Levi': [],
	'PLevi': [],
	'EoW': [],
	'SoS': [],
	'Wish': [],
	'Scourge': [],
}

console.log( "---------- Begin Purge Check at " + moment().format() + " ----------" );

// Get interest list
pool.query("SELECT username, raid FROM interest_list WHERE server_id = ? AND raid != 'Riven' ORDER BY raid", [serverID]).then(async function(results){
	var rows = JSON.parse(JSON.stringify(results));

	if( rows.length > 0 ) {
		for( var i=0; i<rows.length; i++ ) {
			interestList[rows[i].raid].push(rows[i].username);
		}

		for( raid in interestList ) {
			for( var i=0; i<interestList[raid].length; i++ ) {
				await purgeCheck(interestList[raid][i], raid);
			}
		}
	}

	console.log( "Purge List" );
	console.log( interestList2Purge );

	for( raid in interestList2Purge ) {
		for( username in interestList2Purge[raid] ) {
			await pool.query("DELETE FROM interest_list WHERE username = ? AND server_id = ? AND raid = ?", [username, serverID, raid]);
		}
	}

	console.log( "---------- Exit Purge Check at " + moment().format() + " ----------" );

	await purgeNonMembers();

	process.exit();
});

async function purgeNonMembers() {
	await client.login(config.token).then(async function(){
		let discordMembersID = client.guilds.get(serverID).members
		.map(function(member){
			return member.user.id;
		});

		let purgeListIDs = await pool.query("SELECT distinct(user_id) FROM interest_list WHERE server_id = ?", [serverID])
		.then(function(result){
			return result.map(result => { return result.user_id });
		})
		.catch(function(e){
			return [];
		});

		let nonMembers = [];

		for(var i=0; i<purgeListIDs.length; i++) {
			if( discordMembersID.includes( purgeListIDs[i] ) === false )
				nonMembers.push(purgeListIDs[i]);
		}

		if( nonMembers.length > 0 ) {
			console.log( '---------- Removing non-members ----------' );
			console.log( nonMembers );

			await pool.query("DELETE FROM interest_list WHERE server_id = ? AND user_id IN (?)", [serverID, nonMembers]);
			console.log( '---------- Finished removing non-members ----------' );
		}
		else
			console.log( '---------- No non-members found ----------' );

		return client.destroy();
	});
}

async function updateNames() {
	await client.login(config.token).then(async function(){
		let interestListIDs = await pool.query("SELECT distinct(user_id) FROM interest_list WHERE server_id = ?", [serverID])
		.then(function(result){
			return result.map(result => { return result.user_id });
		})
		.catch(function(e){
			return [];
		});

		let discordMembers = client.guilds.get(serverID).members
		.filter(function(member){
			return interestListIDs.includes(member.id);
		})
		.map(function(member){
			return {
				discord_id: member.user.id,
				discord_username: member.user.username,
				discord_nickname: member.nickname
			}
		});

		for(var i=0;i<discordMembers.length;i++) {
			let username = discordMembers[i].discord_nickname ? discordMembers[i].discord_nickname : discordMembers[i].discord_username;
			await pool.query("UPDATE interest_list SET username = ? WHERE user_id = ? AND server_id = ?", [username, discordMembers[i].discord_id, serverID]);
		}

		return client.destroy();
	});
}

async function purgeCheck(username, raidname) {
	var userID = username;

	var raidCompletions = {
		'levi': 0,
		'levip': 0,
		'eow': 0,
		'eowp': 0,
		'sos': 0,
		'sosp': 0,
		'lw': 0,
		'sotp': 0,
	};

	// Get Account
	await traveler.searchDestinyPlayer(membershipType, encodeURIComponent(userID))
	.then(async function(player){

		if( player.Response.length > 0 ) {

			var membershipId = player.Response[0].membershipId;
			var displayName = player.Response[0].displayName;

			await axios.get(raidReportURL + membershipId)
			.then(async function(response){
				if(response.status === 200) {
					if(response.data.response.activities.length > 0) {
						for( var i=0; i<response.data.response.activities.length; i++ ) {
							for( var raid in raidActivityHash ) {
								if( raidActivityHash[raid].includes( response.data.response.activities[i].activityHash ) ) {
									raidCompletions[raid]+=response.data.response.activities[i].values.clears;
								}
							}
						}

						raidExperienceThreshold = 1;
						var db2completionMap = {
							'Levi': 'levi',
							'PLevi': 'levip',
							'EoW': 'eow',
							'SoS': 'sos',
							'Wish': 'lw',
							'Scourge': 'sotp',
						}

						if( raidCompletions[ db2completionMap[raidname] ] >= raidExperienceThreshold ) {
							interestList2Purge[ raidname ][username] = raidCompletions[ db2completionMap[raidname] ];
						}
					}
				}

				return 1;
			})
			.catch(function(error){
				console.log(error.response.status + " " + error.response.statusText);
				console.log(error.config.url);
			});
		}
	})
	.catch(function(error){
		console.log(error);
	});

	return 1;
}
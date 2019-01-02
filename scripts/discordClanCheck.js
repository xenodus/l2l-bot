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
const clanIDs = ['2754160', '2835157'];
const membershipType = 4;

const Discord = require("discord.js");
const client = new Discord.Client();
const serverID = '372462137651757066';

let clanMembersInfo = [];

getClanMembers(clanIDs).then(async function(clanMembersInfo){

	// Array of Members' BNetIDs
	let clanMembersBNetIDs = clanMembersInfo
		.filter(function(member){
			return member.bnetID!=='';
		})
		.map(function(member){
			return member.bnetID.toLowerCase();
		}).sort();

	if( clanMembersInfo.length > 0 ) {

		await pool.query("TRUNCATE TABLE clan_discord");

		client.login(config.token).then(async function(){
			let discordMembers = client.guilds.get(serverID).members
			.filter(function(member){
				return member.nickname != null;
			})
			.map(function(member){
				return {
					discord_id: member.user.id,
					discord_username: member.user.username,
					discord_nickname: member.nickname
				}
			});

			for(var i=0; i<clanMembersInfo.length; i++) {

				let discordAccount = discordMembers.filter(function(member){
					return member.discord_nickname.toLowerCase() == clanMembersInfo[i].bnetID.toLowerCase();
				});

				let discord_id = discordAccount[0] ? discordAccount[0].discord_id : null;
				let discord_nickname = discordAccount[0] ? discordAccount[0].discord_nickname : null;
				let discord_username = discordAccount[0] ? discordAccount[0].discord_username : null;

				let clanDiscordUser = {
					user_id: clanMembersInfo[i].membershipId,
					username: clanMembersInfo[i].displayName,
					bnet_id: clanMembersInfo[i].bnetID,
					clan_no: clanMembersInfo[i].clanNo,
					discord_id: discord_id,
					discord_nickname: discord_nickname,
					discord_username: discord_username,
					last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
				};

				await pool.query("INSERT INTO clan_discord SET ?", clanDiscordUser);
			}

			process.exit();
		});
	}
});

async function getClanMembers(clanIDs) {
	for(key in clanIDs)	{
		var no = 0;

		await axios.get('https://www.bungie.net/Platform/GroupV2/' + clanIDs[key] + '/Members/', { headers: { 'X-API-Key': config.bungieAPIKey } })
		.then(async function(response){
			if( response.status == 200 ) {
				if( response.data.Response.results.length > 0 ) {
					let memberRecords = response.data.Response.results;

					for(var i=0; i<memberRecords.length;i++) {

						let bnetID = '';

						if( memberRecords[i].bungieNetUserInfo && memberRecords[i].bungieNetUserInfo.membershipId ) {

							// Retrieve from DB is info exists
							bnetID = await pool.query("SELECT * FROM destiny_user WHERE bungieId = ? LIMIT 1", [memberRecords[i].bungieNetUserInfo.membershipId])
							.then(function(r){
								if( r.length > 0 ) {
									return r[0].bnetId;
								}
								return '';
							}).catch(function(e){
								return '';
							});

							// Else retrieve from Bungie's slow API
							if( bnetID === '' ) {
								bnetID = await axios.get('https://www.bungie.net/Platform/User/GetBungieNetUserById/' + memberRecords[i].bungieNetUserInfo.membershipId, { headers: { 'X-API-Key': config.bungieAPIKey } })
								.then(function(r){
									if( r.status == 200 ) {
										if( r.data.Response.blizzardDisplayName ) {
											return r.data.Response.blizzardDisplayName;
										}
									}
									return '';
								});

								pool.query("INSERT INTO destiny_user SET ?", {
									destinyId: memberRecords[i].destinyUserInfo.membershipId,
									bungieId: memberRecords[i].bungieNetUserInfo.membershipId,
									display_name: memberRecords[i].destinyUserInfo.displayName,
									bnetId: bnetID
								});
							}
						}

						await clanMembersInfo.push({
							displayName: memberRecords[i].destinyUserInfo.displayName,
							membershipId: memberRecords[i].destinyUserInfo.membershipId,
							bnetID: bnetID,
							clanNo: parseInt(key) + 1
						});

						no++;
						console.log( timestampPrefix() + no + " of " + memberRecords.length + " clan members' info retrieved for clan " + (parseInt(key) + 1) );
					}
				}
			}
		}).catch(function(e){
			console.log(e);
		});
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}

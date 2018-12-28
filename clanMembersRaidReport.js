const config = require('./config').production;
const pool = config.getPool();
const moment = require("moment");
var Traveler = require('the-traveler').default;
let axios = require('axios');

const traveler = new Traveler({
    apikey: config.bungieAPIKey,
    userAgent: 'alvinyeoh', //used to identify your request to the API
    debug: false
});

const raidReportURL = 'https://b9bv2wd97h.execute-api.us-west-2.amazonaws.com/prod/api/player/';
const raidActivityHash = {
	'levi': [2693136600, 2693136601, 2693136602, 2693136603, 2693136604, 2693136605],
	'levip': [417231112, 757116822, 1685065161, 2449714930, 3446541099, 3879860661],
	'eow': [3089205900],
	'eowp': [809170886],
	'sos': [119944200],
	'sosp': [3213556450],
	'lw': [2122313384],
	'sotp': [548750096]
};

const clanMembers = ["xenodus#1931", "crandle#1800"];
const clanIDs = ['2754160', '2835157'];
const membershipType = 4;

// Get Clan
let clanMembersInfo = [];

console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers(clanIDs)
.then(function(clanMembersInfo){
	/*
	if( clanMembersInfo.length > 0 ) {
		console.log(timestampPrefix() + "Performing step 2 of 4: Get Raid Info of Members");

		getRaidInfo(clanMembersInfo)
		.then(function(clanMembersInfo){
			//console.log( clanMembersInfo );
			console.log(timestampPrefix() + "Performing step 3 of 4: Truncating table");
			pool.query("TRUNCATE TABLE clan_raid_report")
			.then(async function(){
				console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

				for(var i=0; i<clanMembersInfo.length; i++) {
					let member = clanMembersInfo[i];

					await pool.query("INSERT INTO clan_raid_report SET ?", {
						user_id: member.membershipId,
						username: member.displayName,
						bnet_id: member.bnetID,
						levi: member.raidCompletions.levi,
						levip: member.raidCompletions.levip,
						eow: member.raidCompletions.eow,
						eowp: member.raidCompletions.eowp,
						sos: member.raidCompletions.sos,
						sosp: member.raidCompletions.sosp,
						lw: member.raidCompletions.lw,
						sotp: member.raidCompletions.sotp,
						last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
					})
				}

				console.log(timestampPrefix() + "Finished!");
				//process.exit();
			})
		});
	}
	*/
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
							})
							.catch(function(e){
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
							raidCompletions: {
								'levi': 0,
								'levip': 0,
								'eow': 0,
								'eowp': 0,
								'sos': 0,
								'sosp': 0,
								'lw': 0,
								'sotp': 0,
							}
						});

						no++;
						console.log( timestampPrefix() + no + " of " + memberRecords.length + " clan members' info retrieved for clan ID " + clanIDs[key] );
					}
				}
			}
		})
		.catch(function(e){
			//console.log(e);
		});
	}

	return clanMembersInfo;
}

async function getRaidInfo(clanMembersInfo) {

	//clanMembersInfo = clanMembersInfo.slice(0, 10);

	for(var i=0; i<clanMembersInfo.length;i++) {
		let userID = clanMembersInfo[i].membershipId;
		let displayName = clanMembersInfo[i].displayName;
		let clanMemberIndex = i;
		let URL = raidReportURL + clanMembersInfo[clanMemberIndex].membershipId;

		await axios.get(URL)
		.then(async function(response){
			if(response.status === 200) {
				if(response.data.response.activities.length > 0) {
					for( var j=0; j<response.data.response.activities.length; j++ ) {
						for( var raid in raidActivityHash ) {
							if( raidActivityHash[raid].includes( response.data.response.activities[j].activityHash ) ) {
								clanMembersInfo[ clanMemberIndex ].raidCompletions[raid] += await response.data.response.activities[j].values.clears;
							}
						}
					}
				}
			}
		})
		.catch(function(e){
			if( e.response.status == 404 ) {
				console.log(timestampPrefix() + "No raid info for " + displayName);
			}
		});

		console.log( timestampPrefix() + (i+1) + " of " + clanMembersInfo.length + " clan members' raid info retrieved" );
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
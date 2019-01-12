const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
var Traveler = require('the-traveler').default;
let axios = require('axios');

const traveler = new Traveler({
    apikey: config.bungieAPIKey,
    userAgent: 'alvinyeoh', //used to identify your request to the API
    debug: false
});

const devMode = false;
const membershipType = 4;
const raidReportURL = 'https://b9bv2wd97h.execute-api.us-west-2.amazonaws.com/prod/api/player/';
const petraRunHash = 4177910003;
const diamondRunHash = 2648109757;
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

// Get Clan
let clanMembersInfo = [];

console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers()
.then(function(clanMembersInfo){

	if( clanMembersInfo.length > 0 ) {
		console.log(timestampPrefix() + "Performing step 2 of 4: Get Raid Info of Members");

		getRaidInfo(clanMembersInfo)
		.then(async function(clanMembersInfo){

			//console.log( clanMembersInfo );
			console.log(timestampPrefix() + "Performing step 3 of 4: Truncating table");

			await pool.query("TRUNCATE TABLE clan_raid_stats")
			.then(async function(){
				console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

				for(var i=0; i<clanMembersInfo.length; i++) {
					let member = clanMembersInfo[i];

					await pool.query("INSERT INTO clan_raid_stats SET ?", {
						user_id: member.membershipId,
						levi: member.raidCompletions.levi,
						levip: member.raidCompletions.levip,
						eow: member.raidCompletions.eow,
						eowp: member.raidCompletions.eowp,
						sos: member.raidCompletions.sos,
						sosp: member.raidCompletions.sosp,
						lw: member.raidCompletions.lw,
						sotp: member.raidCompletions.sotp,
						petra_run: member.petra_run,
						diamond_run: member.diamond_run,
						last_online: member.last_online,
						last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
					})
				}

				console.log(timestampPrefix() + "Finished!");
				process.exit();
			})
		});
	}
});

async function getClanMembers() {

	await pool.query("SELECT * FROM clan_members")
	.then(async function(members){
		if( members.length > 0 ) {

			var no = 0;
			for( var i=0; i<members.length; i++ ) {

				let petra_run = 0;
				let diamond_run = 0;

				await traveler.getProfile(membershipType, members[i].destiny_id, { components: [100, 900] })
				.then(function(r){
					petra_run = r.Response.profileRecords.data.records[petraRunHash].objectives[0].progress > 0 ? 1 : 0;
					diamond_run = r.Response.profileRecords.data.records[diamondRunHash].objectives[0].progress > 0 ? 1 : 0;
				}).catch(function(e){
					//
				});

				clanMembersInfo.push({
					displayName: members[i].display_name,
					membershipId: members[i].destiny_id,
					bnetID: members[i].bnet_id,
					clanNo: members[i].clan_no,
					last_online: members[i].last_online,
					petra_run: petra_run,
					diamond_run: diamond_run,
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
				console.log( timestampPrefix() + no + " of " + members.length + " clan members' info retrieved" );
			}
		}
	});

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
			console.log(timestampPrefix() + "No raid info for " + displayName);
		});

		console.log( timestampPrefix() + (i+1) + " of " + clanMembersInfo.length + " clan members' raid info retrieved" );
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
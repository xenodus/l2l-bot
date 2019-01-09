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

// Get Clan
let clanMembersInfo = [];

console.log("\n\n\n\n" + timestampPrefix() + "---- BEGIN GET PVE STATS SCRIPT ----");
console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers(clanIDs)
.then(function(clanMembersInfo){
	console.log(timestampPrefix() + "Performing step 2 of 4: Get PVE Stats of Clan Members");

	if( clanMembersInfo.length > 0 ) {
		getPVEStats(clanMembersInfo)
		.then(async function(clanMembersInfo){
			//console.log( clanMembersInfo );
			console.log(timestampPrefix() + "Performing step 3 of 4: Truncating tables");
			await pool.query("TRUNCATE TABLE clan_weapon_stats");
			pool.query("TRUNCATE TABLE clan_pve_stats")
			.then(async function(){
				console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

				for(var i=0; i<clanMembersInfo.length; i++) {
					let member = clanMembersInfo[i];

					await pool.query("INSERT INTO clan_pve_stats SET ?", {
						user_id: member.membershipId,
						username: member.displayName,
						bnet_id: member.bnetID,
						clan_no: member.clanNo,
						kills: member.stats.kills,
						deaths: member.stats.deaths,
						suicides: member.stats.suicides,
						kd: member.stats.kd,
						activitiesCleared: member.stats.activitiesCleared,
						weaponKillsSuper: member.stats.weaponKillsSuper,
						weaponKillsMelee: member.stats.weaponKillsMelee,
						weaponKillsGrenade: member.stats.weaponKillsGrenade,
						publicEventsCompleted: member.stats.publicEventsCompleted,
						heroicPublicEventsCompleted: member.stats.heroicPublicEventsCompleted,
						last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
					});

					await pool.query("INSERT INTO clan_weapon_stats SET ?", {
						user_id: member.membershipId,
						username: member.displayName,
						bnet_id: member.bnetID,
						clan_no: member.clanNo,
						weaponKillsAutoRifle: member.stats.weaponKillsAutoRifle,
						weaponKillsBeamRifle: member.stats.weaponKillsBeamRifle,
						weaponKillsBow: member.stats.weaponKillsBow,
						weaponKillsFusionRifle: member.stats.weaponKillsFusionRifle,
						weaponKillsHandCannon: member.stats.weaponKillsHandCannon,
						weaponKillsTraceRifle: member.stats.weaponKillsTraceRifle,
						weaponKillsPulseRifle: member.stats.weaponKillsPulseRifle,
						weaponKillsRocketLauncher: member.stats.weaponKillsRocketLauncher,
						weaponKillsScoutRifle: member.stats.weaponKillsScoutRifle,
						weaponKillsShotgun: member.stats.weaponKillsShotgun,
						weaponKillsSniper: member.stats.weaponKillsSniper,
						weaponKillsSubmachinegun: member.stats.weaponKillsSubmachinegun,
						weaponKillsRelic: member.stats.weaponKillsRelic,
						weaponKillsSideArm: member.stats.weaponKillsSideArm,
						weaponKillsSword: member.stats.weaponKillsSword,
						weaponKillsGrenadeLauncher: member.stats.weaponKillsGrenadeLauncher,
						last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
					})
				}

				console.log(timestampPrefix() + "Finished!");
				console.log(timestampPrefix() + "---- END GET PVE STATS SCRIPT ----" + "\n\n\n\n");
				process.exit();
			})
		})
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

							// Retrieve from DB if info exists
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
								})
								.catch(function(e){
									console.log( timestampPrefix() + 'Error fetching BNetID for: ', memberRecords[i].destinyUserInfo.displayName );
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
							clanNo: parseInt(key) + 1,
							stats: {
								'kills': 0,
								'deaths': 0,
								'suicides': 0,
								'kd': 0,
								'activitiesCleared': 0,
								'weaponKillsSuper': 0,
								'weaponKillsMelee': 0,
								'weaponKillsGrenade': 0,
								'publicEventsCompleted': 0,
								'heroicPublicEventsCompleted': 0,

								// Weapons
								'weaponKillsAutoRifle': 0,
								'weaponKillsBeamRifle': 0,
								'weaponKillsBow': 0,
								'weaponKillsFusionRifle': 0,
								'weaponKillsHandCannon': 0,
								'weaponKillsTraceRifle': 0,
								'weaponKillsPulseRifle': 0,
								'weaponKillsRocketLauncher': 0,
								'weaponKillsScoutRifle': 0,
								'weaponKillsShotgun': 0,
								'weaponKillsSniper': 0,
								'weaponKillsSubmachinegun': 0,
								'weaponKillsRelic': 0,
								'weaponKillsSideArm': 0,
								'weaponKillsSword': 0,
								'weaponKillsGrenadeLauncher': 0,
							}
						});

						no++;
						console.log( timestampPrefix() + no + " of " + memberRecords.length + " clan members' info retrieved for clan ID " + clanIDs[key] );
					}
				}
			}
		}).catch(function(e){
			//console.log(e);
		});
	}

	return clanMembersInfo;
}

async function getPVEStats(clanMembersInfo) {

	//clanMembersInfo = clanMembersInfo.slice(0, 5);

	for(var i=0; i<clanMembersInfo.length;i++) {
		let membershipId = clanMembersInfo[i].membershipId;

		console.log( timestampPrefix() + "Fetching PVE stat of " + (i+1) + " of " + clanMembersInfo.length + " members" );

    await axios.get('https://www.bungie.net/Platform/Destiny2/'+membershipType+'/Account/'+membershipId+'/Stats/', { headers: { 'X-API-Key': config.bungieAPIKey } })
    .then(async function(res){
    	console.log( timestampPrefix() + "Get Account Stats Success." );
      if( res.status == 200 ) {
        clanMembersInfo[i].stats.kills = res.data.Response.mergedAllCharacters.results.allPvE.allTime.kills.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.kills.basic.displayValue : 0;
        clanMembersInfo[i].stats.deaths = res.data.Response.mergedAllCharacters.results.allPvE.allTime.deaths.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.deaths.basic.displayValue : 0;
        clanMembersInfo[i].stats.suicides = res.data.Response.mergedAllCharacters.results.allPvE.allTime.suicides.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.suicides.basic.displayValue : 0;
        clanMembersInfo[i].stats.kd = res.data.Response.mergedAllCharacters.results.allPvE.allTime.killsDeathsRatio.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.killsDeathsRatio.basic.displayValue : 0;
        clanMembersInfo[i].stats.activitiesCleared = res.data.Response.mergedAllCharacters.results.allPvE.allTime.activitiesCleared.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.activitiesCleared.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsSuper = res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsSuper.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsSuper.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsMelee = res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsMelee.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsMelee.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsGrenade = res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsGrenade.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.weaponKillsGrenade.basic.displayValue : 0;
        clanMembersInfo[i].stats.publicEventsCompleted = res.data.Response.mergedAllCharacters.results.allPvE.allTime.publicEventsCompleted.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.publicEventsCompleted.basic.displayValue : 0;
        clanMembersInfo[i].stats.heroicPublicEventsCompleted = res.data.Response.mergedAllCharacters.results.allPvE.allTime.heroicPublicEventsCompleted.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime.heroicPublicEventsCompleted.basic.displayValue : 0;

        // Weapons
        clanMembersInfo[i].stats.weaponKillsAutoRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsAutoRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsAutoRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsBeamRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsBeamRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsBeamRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsBow = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsBow.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsBow.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsFusionRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsFusionRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsFusionRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsHandCannon = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsHandCannon.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsHandCannon.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsTraceRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsTraceRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsTraceRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsPulseRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsPulseRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsPulseRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsRocketLauncher = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsRocketLauncher.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsRocketLauncher.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsScoutRifle = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsScoutRifle.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsScoutRifle.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsShotgun = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsShotgun.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsShotgun.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsSniper = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSniper.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSniper.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsSubmachinegun = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSubmachinegun.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSubmachinegun.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsRelic = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsRelic.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsRelic.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsSideArm = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSideArm.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSideArm.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsSword = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSword.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsSword.basic.displayValue : 0;
        clanMembersInfo[i].stats.weaponKillsGrenadeLauncher = res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsGrenadeLauncher.basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime.weaponKillsGrenadeLauncher.basic.displayValue : 0;
      }
    })
    .catch(function(e){
      //console.log(e);
      console.log( timestampPrefix() + 'Error fetching PVE Stats for: ', clanMembersInfo[i] );
    });
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
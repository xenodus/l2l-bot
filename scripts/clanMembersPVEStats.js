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

const pveKeys = [
  'kills',
  'deaths',
  'suicides',
  'killsDeathsRatio',
  'activitiesCleared',
  'weaponKillsSuper',
  'weaponKillsMelee',
  'weaponKillsGrenade',
  'publicEventsCompleted',
  'heroicPublicEventsCompleted'
];

const weaponKillsKeys = [
  'weaponKillsAutoRifle',
  'weaponKillsBeamRifle',
  'weaponKillsBow',
  'weaponKillsFusionRifle',
  'weaponKillsHandCannon',
  'weaponKillsTraceRifle',
  'weaponKillsPulseRifle',
  'weaponKillsRocketLauncher',
  'weaponKillsScoutRifle',
  'weaponKillsShotgun',
  'weaponKillsSniper',
  'weaponKillsSubmachinegun',
  'weaponKillsRelic',
  'weaponKillsSideArm',
  'weaponKillsSword',
  'weaponKillsGrenadeLauncher'
];

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
			console.log( clanMembersInfo );
			console.log(timestampPrefix() + "Performing step 3 of 4: Truncating tables");
			await pool.query("TRUNCATE TABLE clan_weapon_stats");
			pool.query("TRUNCATE TABLE clan_pve_stats")
			.then(async function(){
				console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

				for(var i=0; i<clanMembersInfo.length; i++) {
					let member = clanMembersInfo[i];

          let pve_stats = Object.assign(Object.assign({}, member.account), member.pve);
					await pool.query("INSERT INTO clan_pve_stats SET ?", pve_stats);

          let weapon_stats = Object.assign(Object.assign({}, member.account), member.weapon);
					await pool.query("INSERT INTO clan_weapon_stats SET ?", weapon_stats)
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

            let member = {
              account: {
                user_id: memberRecords[i].destinyUserInfo.membershipId,
                username: memberRecords[i].destinyUserInfo.displayName,
                bnet_id: bnetID,
                clan_no: parseInt(key) + 1,
                last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
              },
              pve: {},
              weapon: {}
            }

            for(var index in pveKeys) {
              member.pve[pveKeys[index]] = 0;
            }

            for(var index in weaponKillsKeys) {
              member.weapon[weaponKillsKeys[index]] = 0;
            }

						clanMembersInfo.push(member);

						no++;
						console.log( timestampPrefix() + no + " of " + memberRecords.length + " clan members' info retrieved for clan ID " + clanIDs[key] );
					}
				}
			}
		}).catch(function(e){
			console.log(e);
		});
	}

	return clanMembersInfo;
}

async function getPVEStats(clanMembersInfo) {

	//clanMembersInfo = clanMembersInfo.slice(0, 5);

	for(var i=0; i<clanMembersInfo.length;i++) {
		let membershipId = clanMembersInfo[i].account.user_id;

		console.log( timestampPrefix() + "Fetching PVE stat of " + (i+1) + " of " + clanMembersInfo.length + " members" );

    await axios.get('https://www.bungie.net/Platform/Destiny2/'+membershipType+'/Account/'+membershipId+'/Stats/', { headers: { 'X-API-Key': config.bungieAPIKey } })
    .then(async function(res){
    	console.log( timestampPrefix() + "Get Account Stats Success." );
      if( res.status == 200 ) {
        // PVE
        for(var index in pveKeys) {
          clanMembersInfo[i].pve[pveKeys[index]] = res.data.Response.mergedAllCharacters.results.allPvE.allTime[pveKeys[index]].basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvE.allTime[pveKeys[index]].basic.displayValue : 0;
        }

        // Weapons
        for(var index in weaponKillsKeys) {
          clanMembersInfo[i].weapon[weaponKillsKeys[index]] = res.data.Response.mergedAllCharacters.merged.allTime[weaponKillsKeys[index]].basic.displayValue ? res.data.Response.mergedAllCharacters.merged.allTime[weaponKillsKeys[index]].basic.displayValue : 0;
        }
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
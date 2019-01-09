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
const glory_hash = 2000925172; // competitive
const valor_hash = 3882308435; // quickplay
const infamy_hash = 2772425241; // gambit
const valor_reset_hash = 115001349;
const infamy_reset_hash = 3901785488;
const gold_medals_hash = [4230088036, 1371679603, 3882642308, 1413337742, 2857093873, 1271667367, 3324094091];

// Get Clan
let clanMembersInfo = [];

console.log("\n\n\n\n" + timestampPrefix() + "---- BEGIN GET PVP STATS SCRIPT ----");
console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers(clanIDs)
.then(function(clanMembersInfo){
	console.log(timestampPrefix() + "Performing step 2 of 4: Get PVP Stats Clan Members");

	if( clanMembersInfo.length > 0 ) {
		getPVPStats(clanMembersInfo)
		.then(function(clanMembersInfo){
			//console.log( clanMembersInfo );
			console.log(timestampPrefix() + "Performing step 3 of 4: Truncating table");
			pool.query("TRUNCATE TABLE clan_pvp_stats")
			.then(async function(){
				console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

				for(var i=0; i<clanMembersInfo.length; i++) {
					let member = clanMembersInfo[i];

					await pool.query("INSERT INTO clan_pvp_stats SET ?", {
						user_id: member.membershipId,
						username: member.displayName,
						bnet_id: member.bnetID,
						clan_no: member.clanNo,
            triumph: member.stats.triumph,
            gold_medals: member.stats.gold_medals,
						kd: member.stats.kd,
						kad: member.stats.kad,
						kda: member.stats.kda,
						valor: member.stats.valor,
						glory: member.stats.glory,
						infamy: member.stats.infamy,
						valor_step: member.stats.valor_step,
						glory_step: member.stats.glory_step,
						infamy_step: member.stats.infamy_step,
            valor_resets: member.stats.valor_resets,
            infamy_resets: member.stats.infamy_resets,
						last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
					})
				}

				console.log(timestampPrefix() + "Finished!");
				console.log(timestampPrefix() + "---- END GET PVP STATS SCRIPT ----" + "\n\n\n\n");
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
                'triumph': 0,
                'gold_medals': 0,
								'kd': 0,
								'kad': 0,
								'kda': 0,
								'glory': 0,
								'valor': 0,
								'infamy': 0,
								'glory_step': 0,
								'valor_step': 0,
								'infamy_step': 0,
                'valor_resets': 0,
                'infamy_resets': 0
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

async function getPVPStats(clanMembersInfo) {

	//clanMembersInfo = clanMembersInfo.slice(0, 5);

	for(var i=0; i<clanMembersInfo.length;i++) {
		let membershipId = clanMembersInfo[i].membershipId;

		console.log( timestampPrefix() + "Fetching PVP stat of " + (i+1) + " of " + clanMembersInfo.length + " members" );

		await traveler.getProfile(membershipType, membershipId, {components: ['100', '202', '900']})
    .then(async function(r){
    	console.log( timestampPrefix() + "Get Profile Success." );
      if( r.Response.characterProgressions.data && Object.keys(r.Response.characterProgressions.data).length > 0 ) {
        let characterID = Object.keys(r.Response.characterProgressions.data).shift();
        let triumpPoints = r.Response.profileRecords.data.score;
        let valorResets = r.Response.profileRecords.data.records[valor_reset_hash].objectives[0].progress ? r.Response.profileRecords.data.records[valor_reset_hash].objectives[0].progress : 0;
        let infamyResets = r.Response.profileRecords.data.records[infamy_reset_hash].objectives[0].progress ? r.Response.profileRecords.data.records[infamy_reset_hash].objectives[0].progress : 0;
        let goldMedals = 0;

        for( var index in gold_medals_hash ) {
          let hash = gold_medals_hash[index];
          goldMedals += r.Response.profileRecords.data.records[hash].objectives[0].progress ? r.Response.profileRecords.data.records[hash].objectives[0].progress : 0;
        }

        await axios.get('https://www.bungie.net/Platform/Destiny2/'+membershipType+'/Account/'+membershipId+'/Stats/', { headers: { 'X-API-Key': config.bungieAPIKey } })
        .then(async function(res){
        	console.log( timestampPrefix() + "Get Account Stats Success." );
          if( res.status == 200 ) {
            clanMembersInfo[i].stats.kad = res.data.Response.mergedAllCharacters.results.allPvP.allTime.efficiency.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvP.allTime.efficiency.basic.displayValue : 0;
            clanMembersInfo[i].stats.kda = res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsAssists.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsAssists.basic.displayValue : 0;
            clanMembersInfo[i].stats.kd = res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsRatio.basic.displayValue ? res.data.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsRatio.basic.displayValue : 0;
          }
        })
        .catch(function(e){
          //console.log(e);
          console.log( timestampPrefix() + 'Error fetching PVP Stats for: ', clanMembersInfo[i] );
        });

        clanMembersInfo[i].stats.gold_medals = goldMedals;
        clanMembersInfo[i].stats.triumph = triumpPoints;
        clanMembersInfo[i].stats.valor_resets = valorResets;
        clanMembersInfo[i].stats.infamy_resets = infamyResets;

        clanMembersInfo[i].stats.infamy = r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress : 0;
        clanMembersInfo[i].stats.valor = r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress : 0;
        clanMembersInfo[i].stats.glory = r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress : 0;

        clanMembersInfo[i].stats.infamy_step = r.Response.characterProgressions.data[characterID].progressions[infamy_hash].level ? r.Response.characterProgressions.data[characterID].progressions[infamy_hash].level : 0;
        clanMembersInfo[i].stats.valor_step = r.Response.characterProgressions.data[characterID].progressions[valor_hash].level ? r.Response.characterProgressions.data[characterID].progressions[valor_hash].level : 0;
        clanMembersInfo[i].stats.glory_step = r.Response.characterProgressions.data[characterID].progressions[glory_hash].level ? r.Response.characterProgressions.data[characterID].progressions[glory_hash].level : 0;

        console.log( clanMembersInfo[i] );
      }
    })
    .catch(function(e){
      //console.log(e);
      console.log( timestampPrefix() + 'Error fetching PVP Stats for: ', clanMembersInfo[i] );
    });
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
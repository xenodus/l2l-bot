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

const membershipType = 4;
const glory_hash = 2000925172; // competitive
const valor_hash = 3882308435; // quickplay
const valor_reset_hash = 115001349;
const gold_medals_hash = [4230088036, 1371679603, 3882642308, 1413337742, 2857093873, 1271667367, 3324094091];

// Get Clan
let clanMembersInfo = [];

console.log("\n\n\n\n" + timestampPrefix() + "---- BEGIN GET PVP STATS SCRIPT ----");
console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers()
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
            triumph: member.stats.triumph,
            gold_medals: member.stats.gold_medals,
						kd: member.stats.kd,
						kad: member.stats.kad,
						kda: member.stats.kda,
						valor: member.stats.valor,
						glory: member.stats.glory,
						valor_step: member.stats.valor_step,
						glory_step: member.stats.glory_step,
            valor_resets: member.stats.valor_resets,
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

async function getClanMembers() {

  await pool.query("SELECT * FROM clan_members")
  .then(async function(members){
    if( members.length > 0 ) {

      var no = 0;
      for( var i=0; i<members.length; i++ ) {

        clanMembersInfo.push({
          displayName: members[i].display_name,
          membershipId: members[i].destiny_id,
          bnetID: members[i].bnet_id,
          clanNo: members[i].clan_no,
          stats: {
            'triumph': 0,
            'gold_medals': 0,
            'kd': 0,
            'kad': 0,
            'kda': 0,
            'glory': 0,
            'valor': 0,
            'glory_step': 0,
            'valor_step': 0,
            'valor_resets': 0
          }
        });

        no++;
        console.log( timestampPrefix() + no + " of " + members.length + " clan members' info retrieved" );
      }
    }
  });

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

        clanMembersInfo[i].stats.valor = r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[valor_hash].currentProgress : 0;
        clanMembersInfo[i].stats.glory = r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[glory_hash].currentProgress : 0;

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
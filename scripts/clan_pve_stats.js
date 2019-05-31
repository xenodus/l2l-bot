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

getClanMembers()
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

async function getClanMembers() {

  await pool.query("SELECT * FROM clan_members")
  .then(async function(members){
    if( members.length > 0 ) {

      var no = 0;
      for( var i=0; i<members.length; i++ ) {

        let member = {
          account: {
            user_id: members[i].destiny_id,
            last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
          },
          pve: {},
          weapon: {}
        }

        for(var index in pveKeys) {
          member.pve[pveKeys[index]] = 0;
        }

        member.pve['characters_deleted'] = 0;

        for(var index in weaponKillsKeys) {
          member.weapon[weaponKillsKeys[index]] = 0;
        }

        clanMembersInfo.push(member);

        no++;
        console.log( timestampPrefix() + no + " of " + members.length + " clan members' info retrieved" );
      } // endfor
    } // endif
  }); // end if

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

        if( res.data.Response.characters.length > 0 )
          clanMembersInfo[i].pve['characters_deleted'] = res.data.Response.characters.filter(function(char){ return char.deleted == true }).length;

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

    console.log( clanMembersInfo[i] );
	}

	return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
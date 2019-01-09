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
const infamy_hash = 2772425241;
const infamy_reset_hash = 3901785488;
const gambitKeys = [
  'activitiesEntered',
  'activitiesWon',
  'kills',
  'deaths',
  'killsDeathsRatio',
  'suicides',
  'efficiency',
  'invasionKills',
  'invaderKills',
  'invaderDeaths',
  'primevalDamage',
  'primevalHealing',
  'motesDeposited',
  'motesDenied',
  'motesLost',
  'smallBlockersSent',
  'mediumBlockersSent',
  'largeBlockersSent'
];

// Get Clan
let clanMembersInfo = [];

console.log("\n\n\n\n" + timestampPrefix() + "---- BEGIN GET GAMBIT STATS SCRIPT ----");
console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers(clanIDs)
.then(function(clanMembersInfo){
  console.log(timestampPrefix() + "Performing step 2 of 4: Get PVP Stats Clan Members");

  if( clanMembersInfo.length > 0 ) {
    getPVPStats(clanMembersInfo)
    .then(function(clanMembersInfo){
      //console.log( clanMembersInfo );
      console.log(timestampPrefix() + "Performing step 3 of 4: Truncating table");
      pool.query("TRUNCATE TABLE clan_gambit_stats")
      .then(async function(){
        console.log(timestampPrefix() + "Performing step 4 of 4: Inserting records");

        for(var i=0; i<clanMembersInfo.length; i++) {
          let member = clanMembersInfo[i];
          await pool.query("INSERT INTO clan_gambit_stats SET ?", member)
        }

        console.log(timestampPrefix() + "Finished!");
        console.log(timestampPrefix() + "---- END GET GAMBIT STATS SCRIPT ----" + "\n\n\n\n");
        process.exit();
      })
    })
  }
});

async function getClanMembers(clanIDs) {
  for(key in clanIDs) {
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
              user_id: memberRecords[i].destinyUserInfo.membershipId,
              username: memberRecords[i].destinyUserInfo.displayName,
              bnet_id: bnetID,
              clan_no: parseInt(key) + 1,
              last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
            }

            for(var index in gambitKeys) {
              member[gambitKeys[index]] = 0;
            }

            await clanMembersInfo.push(member);

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
    let membershipId = clanMembersInfo[i].user_id;

    console.log( timestampPrefix() + "Fetching PVP stat of " + (i+1) + " of " + clanMembersInfo.length + " members" );

    await traveler.getProfile(membershipType, membershipId, {components: ['100', '202', '900']})
    .then(async function(r){
      console.log( timestampPrefix() + "Get Profile Success." );
      if( r.Response.characterProgressions.data && Object.keys(r.Response.characterProgressions.data).length > 0 ) {

        // Infamy Stats
        let characterID = Object.keys(r.Response.characterProgressions.data).shift();

        clanMembersInfo[i].infamy_resets = r.Response.profileRecords.data.records[infamy_reset_hash].objectives[0].progress ? r.Response.profileRecords.data.records[infamy_reset_hash].objectives[0].progress : 0;
        clanMembersInfo[i].infamy = r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress ? r.Response.characterProgressions.data[characterID].progressions[infamy_hash].currentProgress : 0;
        clanMembersInfo[i].infamy_step = r.Response.characterProgressions.data[characterID].progressions[infamy_hash].level ? r.Response.characterProgressions.data[characterID].progressions[infamy_hash].level : 0;

        // Gambit Game Stats
        await axios.get('https://www.bungie.net/Platform/Destiny2/'+membershipType+'/Account/'+membershipId+'/Character/0/Stats/?groups=0,0&periodType=0&modes=63', { headers: { 'X-API-Key': config.bungieAPIKey } })
        .then(async function(res){
          console.log( timestampPrefix() + "Get Gambit Stats Success." );
          if( res.status == 200 ) {
            for(var index in gambitKeys) {
              // Remove % from string
              if(gambitKeys[index]=='primevalHealing')
                res.data.Response.pvecomp_gambit.allTime[gambitKeys[index]].basic.displayValue = res.data.Response.pvecomp_gambit.allTime[gambitKeys[index]].basic.displayValue.replace("%", "");

              clanMembersInfo[i][gambitKeys[index]] = res.data.Response.pvecomp_gambit.allTime[gambitKeys[index]].basic.displayValue ? res.data.Response.pvecomp_gambit.allTime[gambitKeys[index]].basic.displayValue : 0;
            }
          }
        })
        .catch(function(e){
          //console.log(e);
          console.log( timestampPrefix() + 'Error fetching Gambit Stats at step 1 for: ', clanMembersInfo[i] );
        });

        console.log( clanMembersInfo[i] );
      }
    })
    .catch(function(e){
      //console.log(e);
      console.log( timestampPrefix() + 'Error fetching Gambit Stats at step 2 for: ', clanMembersInfo[i] );
    });
  }

  return clanMembersInfo;
}

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
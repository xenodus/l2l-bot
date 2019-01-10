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
const clanIDs = ['2754160', '2835157'];
const membershipType = 4;

// Get Clan
let clanMembersInfo = [];

console.log(timestampPrefix() + "Performing step 1 of 4: Get Clan Members");

getClanMembers(clanIDs)
.then(async function(clanMembersInfo){
  if( clanMembersInfo.length > 0 ) {
    console.log(timestampPrefix() + "Performing step 2 of 3: Truncating table");

    // destiny_id = user_id = membershipId
    await pool.query("TRUNCATE TABLE clan_members");

    console.log(timestampPrefix() + "Performing step 3 of 3: Inserting records");
    for(var i=0; i<clanMembersInfo.length; i++) {
      let member = clanMembersInfo[i];

      await pool.query("INSERT INTO clan_members SET ?", {
        destiny_id: member.membershipId,
        display_name: member.displayName,
        bnet_id: member.bnetID,
        clan_no: member.clanNo,
        triumph: member.triumph,
        last_online: member.last_online,
        last_updated: moment().format("YYYY-MM-DD HH:mm:ss")
      });
    }

    console.log(timestampPrefix() + "Finished!");
    process.exit();
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

          if( devMode )
            memberRecords = memberRecords.splice(0,2);

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

            let last_online = null;
            let triumph = 0;

            await traveler.getProfile(membershipType, memberRecords[i].destinyUserInfo.membershipId, { components: [100, 900] })
            .then(function(r){
              last_online = r.Response.profile.data.dateLastPlayed;
              last_online = moment(last_online.substr(0,10), "YYYY-MM-DD").isValid() ? moment(last_online.substr(0,10), "YYYY-MM-DD").format("YYYY-MM-DD") : null;
              triumph = r.Response.profileRecords.data.score;
            }).catch(function(e){
              //
            });

            await clanMembersInfo.push({
              displayName: memberRecords[i].destinyUserInfo.displayName,
              membershipId: memberRecords[i].destinyUserInfo.membershipId,
              bnetID: bnetID,
              clanNo: parseInt(key) + 1,
              triumph: triumph,
              last_online: last_online
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

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
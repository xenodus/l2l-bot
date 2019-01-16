const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
var Traveler = require('the-traveler').default;
let axios = require('axios');

const traveler = new Traveler({
    apikey: config.bungieAPIKey,
    userAgent: 'https://sgelites.com', //used to identify your request to the API
    debug: false
});

const characterId = '2305843009339205184';
const destinyMembershipId = '4611686018474971535';
const membershipType = 4;

const nightfallActivityTypeHash = '575572995';

// Manifest reference: https://data.destinysets.com/
// Live manifest: https://destiny.plumbing/

const manifest = {
  'VendorDefinition': 'https://destiny.plumbing/en/raw/DestinyVendorDefinition.json',
  'ItemDefinition': 'https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json'
};

traveler.getCharacter(membershipType, destinyMembershipId, characterId, { components: [204] }).then(async function(response){
  activities = response.Response.activities.data.availableActivities.filter(function(activity){
    return activity.displayLevel == 50;
  });

  if( activities.length > 0 ) {
    activityDefinition = await getActivityDefinition();
    await pool.query("TRUNCATE TABLE active_nightfall");
    let nightfalls = [];

    for(var i=0; i<activities.length; i++) {
      // Only modifiers array > 0 is real nightfall
      if( activityDefinition[ activities[i].activityHash ].activityTypeHash == nightfallActivityTypeHash && activityDefinition[ activities[i].activityHash ].modifiers.length > 0 ) {

        nf = {
          name: activityDefinition[ activities[i].activityHash ].displayProperties.name,
          description: activityDefinition[ activities[i].activityHash ].displayProperties.description,
          icon: activityDefinition[ activities[i].activityHash ].displayProperties.icon,
          hash: activities[i].activityHash,
          date_added: moment().format('YYYY-MM-DD H:00:00')
        };

        await pool.query("INSERT INTO active_nightfall SET ?", nf)
        .catch(function(e){
          console.log("Error Code: " + e.errno + " >>> " + e.sqlMessage);
        });

        nightfalls.push( {
          a: activityDefinition[ activities[i].activityHash ].displayProperties,
          b: activityDefinition[ activities[i].activityHash ],
          c: activities[i]
        } );
      }
    }

    console.log(nightfalls);
  }

  process.exit();
});

async function getActivityDefinition() {
  let data = {};

  await axios.get('https://destiny.plumbing/en/raw/DestinyActivityDefinition.json').then(function(response){
    data = response.data;
  });

  return data;
}
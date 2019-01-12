const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
let axios = require('axios');

// Running once per hour

console.log( timestampPrefix() + "Get clan online no" );

axios.get('https://sgelites.com/api/live/clan/online')
.then(async function(response){
  if( response.status == 200 ) {
    let result = JSON.parse(response.data);
    let clanIDs = Object.keys( result );

    for(key in clanIDs) {
      await pool.query("INSERT INTO clan_historical_online_stats SET ? ON DUPLICATE KEY UPDATE no_online = " + result[ clanIDs[key] ].online, {
        clan_no: parseInt(key) + 1,
        no_online: result[ clanIDs[key] ].online,
        datetime: moment().format('YYYY-MM-DD H:00:00')
      });
    }

    console.log( timestampPrefix() + "End get clan online no" );
    process.exit();
  }
}).catch(function(e){
  //console.log(e);
  console.log(e);
  process.exit();
});

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
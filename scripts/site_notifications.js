const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
const axios = require('axios');
const url = 'https://onesignal.com/api/v1/notifications';

const pushConfig = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': 'Basic ' + config.oneSignalAPIKey
  }
};

pool.query("SELECT * FROM event WHERE status = ? AND notified = ? AND event_date > NOW() AND server_id = ? ORDER BY event_date ASC", ['active', 0, '372462137651757066'])
.then(async function(results){
  if( results.length > 0 ) {
    for( var i=0; i<results.length; i++ ) {

      let pushData = {
        'app_id': config.oneSignalAppId,
        'contents': {"en": results[i].event_name},
        'url': 'https://sgelites.com/events',
        'included_segments': ['All']
      };

      await pool.query("UPDATE event SET notified = ? WHERE event_id = ?", [1, results[i].event_id]);

      await axios.post(url, pushData, pushConfig).then(function(res){
        console.log(timestampPrefix() + "Push notification sent for event ID: " + results[i].event_id + " | " + results[i].event_name, " | Status code: " + res.status);
      });
    }
  }
  else {
    console.log(timestampPrefix() + "No events.");
  }

  process.exit();
});

function timestampPrefix() {
  return "[" + moment().format() + "] ";
}
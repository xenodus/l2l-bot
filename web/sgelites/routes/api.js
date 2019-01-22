const config = require('../../../config').production;
const pool = config.getPool();
const moment = require("moment");

var express = require('express');
var router = express.Router();

let axios = require('axios');

router.get('/members', function(req, res, next) {
  pool.query("SELECT * FROM `clan_members` WHERE 1")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/characters', function(req, res, next) {
  pool.query("SELECT * FROM clan_members_characters")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/events', function(req, res, next) {
  let serverID = '372462137651757066';
  let sql = `
  SELECT
  event.*,
  COALESCE(event_signup_confirmed.confirmed, 0) as confirmed,
  COALESCE(event_signup_reserve.reserve, 0) as reserve
  FROM event

  LEFT JOIN (SELECT event_id, type, count(type) as confirmed FROM event_signup WHERE type='confirmed' group by event_id, type) as event_signup_confirmed ON event.event_id = event_signup_confirmed.event_id
  LEFT JOIN (SELECT event_id, type, count(type) as reserve FROM event_signup WHERE type='reserve' group by event_id, type) as event_signup_reserve ON event.event_id = event_signup_reserve.event_id

  WHERE
  event.server_id = ? AND
  event.status = 'active' AND
  ( event_date IS NULL OR event_date + INTERVAL 3 HOUR >= NOW() )
  ORDER BY event.event_date ASC, event.event_id  DESC
  `;

  pool.query(sql, [serverID])
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/nightfall', async function(req, res, next) {
  pool.query("SELECT * FROM active_nightfall")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/vendor/:vendor_hash?', async function(req, res, next) {
  let vendor_hash = req.params.vendor_hash;

  if( vendor_hash ) {
    pool.query("SELECT * FROM `vendor_sales` WHERE vendor_hash = ? ORDER BY vendor_hash, itemTypeDisplayName", [
      vendor_hash,
      moment().format('YYYY-MM-DD H:00:00')
    ])
    .then(function(results){
      res.json( JSON.stringify(results) );
    })
  }
  else {
    pool.query("SELECT * FROM `vendor_sales` WHERE 1 ORDER BY vendor_hash, itemTypeDisplayName", [
      moment().format('YYYY-MM-DD H:00:00')
    ])
    .then(function(results){
      res.json( JSON.stringify(results) );
    })
  }
});

router.get('/live/clan/online', async function(req, res, next) {

  let clan_members_online = {
    '2754160': {
      'online': 0
    },
    '2835157': {
      'online': 0
    }
  }

  let clanIDs = Object.keys(clan_members_online);

  for(key in clanIDs) {
    await axios.get('https://www.bungie.net/Platform/GroupV2/' + clanIDs[key] + '/Members/', { headers: { 'X-API-Key': config.bungieAPIKey } })
    .then(async function(response){
      if( response.status == 200 ) {
        if( response.data.Response.results.length > 0 ) {
          clan_members_online[ clanIDs[key] ]['online'] = response.data.Response.results.filter(function(member){ return member.isOnline == true; }).length;
        }
      }
    }).catch(function(e){
      //console.log(e);
    });
  }

  res.json( JSON.stringify(clan_members_online) );
});

router.get('/stats/online/detailed', function(req, res, next) {
  pool.query("SELECT datetime, sum(no_online) as no_online FROM `clan_historical_online_stats` WHERE 1 GROUP BY  datetime")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/online', function(req, res, next) {
  pool.query("SELECT datetime, sum(no_online) as no_online FROM `clan_historical_online_stats` WHERE datetime >= ( CURDATE() - INTERVAL 7 DAY ) GROUP BY  datetime")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/raid', function(req, res, next) {
  pool.query("SELECT * FROM clan_raid_stats LEFT JOIN clan_members ON clan_raid_stats.user_id = clan_members.destiny_id")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/pve', function(req, res, next) {
  pool.query("SELECT clan_members.*, clan_pve_stats.*, (levi + levip + eow + eowp + sos + sosp + lw + sotp) as raid_count FROM `clan_pve_stats` JOIN clan_raid_stats ON clan_pve_stats.user_id = clan_raid_stats.user_id JOIN clan_members ON clan_pve_stats.user_id = clan_members.destiny_id")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/pvp', function(req, res, next) {
  pool.query("SELECT * FROM clan_pvp_stats LEFT JOIN clan_members ON clan_pvp_stats.user_id = clan_members.destiny_id")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/gambit', function(req, res, next) {
  pool.query("SELECT * FROM clan_gambit_stats LEFT JOIN clan_members ON clan_gambit_stats.user_id = clan_members.destiny_id")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/weapons', function(req, res, next) {
  pool.query("SELECT * FROM clan_weapon_stats LEFT JOIN clan_members ON clan_weapon_stats.user_id = clan_members.destiny_id")
  .then(function(results){
    res.json( JSON.stringify(results) );
  })
});

router.get('/stats/all', async function(req, res, next) {

  let raid_results = await pool.query("SELECT * FROM clan_raid_stats LEFT JOIN clan_members ON clan_raid_stats.user_id = clan_members.destiny_id");
  let pvp_results = await pool.query("SELECT * FROM clan_pvp_stats LEFT JOIN clan_members ON clan_pvp_stats.user_id = clan_members.destiny_id");
  let gambit_results = await pool.query("SELECT * FROM clan_gambit_stats LEFT JOIN clan_members ON clan_gambit_stats.user_id = clan_members.destiny_id");
  let pve_results = await pool.query("SELECT clan_members.*, clan_pve_stats.*, (levi + levip + eow + eowp + sos + sosp + lw + sotp) as raid_count FROM `clan_pve_stats` JOIN clan_raid_stats ON clan_pve_stats.user_id = clan_raid_stats.user_id JOIN clan_members ON clan_pve_stats.user_id = clan_members.destiny_id");
  let weapon_results = await pool.query("SELECT * FROM clan_weapon_stats LEFT JOIN clan_members ON clan_weapon_stats.user_id = clan_members.destiny_id");
  let triumph_results = await pool.query("SELECT display_name as username, bnet_id, clan_no, triumph, last_updated FROM clan_members");

  let data = {
    raid: raid_results,
    pvp: pvp_results,
    pve: pve_results,
    gambit: gambit_results,
    weapon: weapon_results,
    triumph: triumph_results
  };

  res.json( data );
});

module.exports = router;

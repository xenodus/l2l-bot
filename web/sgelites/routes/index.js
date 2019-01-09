const config = require('../../../config').production;
const pool = config.getPool();
const moment = require("moment");

var express = require('express');
var router = express.Router();

var sm = require('sitemap');
var sitemap = sm.createSitemap ({
  hostname: 'https://sgelites.com',
  cacheTime: 600000,  // 600 sec cache period
  urls: [
    { url: '/' },
    { url: '/roster',  changefreq: 'weekly',  priority: 0.7 },
    { url: '/events',  changefreq: 'daily',  priority: 0.7 },
    { url: '/leaderboards',  changefreq: 'daily',  priority: 0.7 }
  ]
});

router.get('/sitemap.xml', function(req, res, next) {
  res.header('Content-Type', 'application/xml');
  res.send( sitemap.toString() );
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'SG-Elite: A Destiny 2 Clan from Singapore' });
});

router.get('/events', async function(req, res, next) {
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
  ORDER BY event.event_id  DESC
  `;

  let events = await pool.query(sql, [serverID]);
  res.render('events', { title: 'Events', events: JSON.stringify(events) });
});

router.get('/roster', async function(req, res, next) {
  let members = await pool.query("SELECT username, bnet_id, clan_no, last_online FROM `clan_raid_report` WHERE 1");
  res.render('roster', { title: 'Roster', members: members, moment: moment });
});

router.get('/leaderboards', async function(req, res, next) {
  let raid_results = await pool.query("SELECT * FROM clan_raid_report");
  let pvp_results = await pool.query("SELECT * FROM clan_pvp_stats");
  let pve_results = await pool.query("SELECT clan_pve_stats.*, (levi + levip + eow + eowp + sos + sosp + lw + sotp) as raid_count FROM `clan_pve_stats` JOIN clan_raid_report ON clan_pve_stats.user_id = clan_raid_report.user_id");
  let weapon_results = await pool.query("SELECT * FROM clan_weapon_stats");
  let triumph_results = await pool.query("SELECT username, bnet_id, clan_no, triumph, last_updated FROM clan_pvp_stats");

  let data = {
    raid: raid_results,
    pvp: pvp_results,
    pve: pve_results,
    weapon: weapon_results,
    triumph: triumph_results
  };
  res.render('leaderboards', { title: 'Leaderboards', data: JSON.stringify(data), moment: moment });
});

module.exports = router;

var express = require('express');
var router = express.Router();

var sm = require('sitemap');
var sitemap = sm.createSitemap ({
  hostname: 'https://sgelites.com',
  cacheTime: 600000,  // 600 sec cache period
  urls: [
    { url: '/',  changefreq: 'daily',  priority: 0.7 },
    { url: '/roster',  changefreq: 'weekly',  priority: 0.7 },
    { url: '/events',  changefreq: 'daily',  priority: 0.7 },
    { url: '/leaderboards',  changefreq: 'daily',  priority: 0.7 },
    { url: '/charts',  changefreq: 'daily',  priority: 0.7 }
  ]
});

router.get('/sitemap.xml', function(req, res, next) {
  res.header('Content-Type', 'application/xml');
  res.send( sitemap.toString() );
});

router.get('/test', function(req, res, next) {
  res.render('test', { title: 'SG-Elites: A Destiny 2 Clan from Singapore' });
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'SG-Elites: A Destiny 2 Clan from Singapore' });
});

router.get('/events', async function(req, res, next) {
  res.render('events', { title: 'Events' });
});

router.get('/roster', async function(req, res, next) {
  res.render('roster', { title: 'Roster' });
});

router.get('/leaderboards', async function(req, res, next) {
  res.render('leaderboards', { title: 'Leaderboards' });
});

router.get('/charts', async function(req, res, next) {
  res.render('charts', { title: 'Charts' });
});

module.exports = router;

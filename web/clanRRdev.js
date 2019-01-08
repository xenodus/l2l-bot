const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");

const express = require('express');
const app = express();
const port = 8082;
const ip = '172.31.24.166';

const raids = {
	'Levi': 'levi',
	'Levi Pres.': 'levip',
	'EoW': 'eow',
	'EoW Pres.': 'eowp',
	'SoS': 'sos',
	'SoS Pres.': 'sosp',
	'LW': 'lw',
	'SoTP': 'sotp',
};

const valorRanks = [
	'Guardian',
	'Brave',
	'Heroic',
	'Fabled',
	'Mythic',
	'Legend',
];

const gloryRanks = [
	'Guardian I',
	'Guardian II',
	'Guardian III',
	'Brave I',
	'Brave II',
	'Brave III',
	'Heroic I',
	'Heroic II',
	'Heroic III',
	'Fabled I',
	'Fabled II',
	'Fabled III',
	'Mythic I',
	'Mythic II',
	'Mythic III',
	'Legend',
];

const infamyRanks = [
	'Guardian I',
	'Guardian II',
	'Guardian III',
	'Brave I',
	'Brave II',
	'Brave III',
	'Heroic I',
	'Heroic II',
	'Heroic III',
	'Fabled I',
	'Fabled II',
	'Fabled III',
	'Mythic I',
	'Mythic II',
	'Mythic III',
	'Legend',
];

app.use(express.static(__dirname + '/public'));

app.get('/', async function(req, res){
	raid_results = await pool.query("SELECT * FROM clan_raid_report");
	pvp_results = await pool.query("SELECT * FROM clan_pvp_stats");
	pve_results = await pool.query("SELECT clan_pve_stats.*, (levi + levip + eow + eowp + sos + sosp + lw + sotp) as raid_count FROM `clan_pve_stats` JOIN clan_raid_report ON clan_pve_stats.user_id = clan_raid_report.user_id");

	data = {
		raid: raid_results,
		pvp: pvp_results,
		pve: pve_results
	};
	await res.write( simpleHTML( data ) ); //write a response to the client
	await res.end(); //end the response
});

app.listen(port, ip, () => console.log(`SGE ClanRR listening on port ${port}!`));

function simpleHTML( data ) {

	var raid_data = JSON.parse(JSON.stringify(data.raid));
	var pvp_data = JSON.parse(JSON.stringify(data.pvp));
	var pve_data = JSON.parse(JSON.stringify(data.pve));

	return `
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
			<title>[DEV] SG-E Clan 1 & 2 Raid Report</title>
			<!--[if IE]><link rel="shortcut icon" href="favicon.ico"><![endif]-->
			<!-- Touch Icons - iOS and Android 2.1+ 180x180 pixels in size. -->
			<link rel="apple-touch-icon-precomposed" href="favicon.png">
			<!-- Firefox, Chrome, Safari, IE 11+ and Opera. 196x196 pixels in size. -->
			<link rel="icon" href="favicon.png">

			<!-- JS -->
			<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.js"></script>
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/dataTables.bootstrap4.min.js"></script>
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/fixedheader/3.1.5/js/dataTables.fixedHeader.min.js"></script>

			<script type="text/javascript" src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>
			<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.23.0/moment.min.js"></script>

			<!-- CSS -->
			<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
			<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/dataTables.bootstrap4.min.css">
			<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/fixedheader/3.1.5/css/fixedHeader.bootstrap4.min.css">

			<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css" integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/" crossorigin="anonymous">
			<link href="https://fonts.googleapis.com/css?family=Comfortaa:700" rel="stylesheet">
			<link rel="stylesheet" href="/css/style.css">
		</head>
		<body style="padding: 30px;">
			<div class="container-fluid">

				<ul class="nav nav-pills" id="pills-tab" role="tablist">
				  <li class="nav-item">
				    <a class="nav-link active" id="pills-summary-tab" data-toggle="pill" href="#pills-summary" role="tab" aria-controls="pills-summary" aria-selected="true">Summary</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-report-tab" data-toggle="pill" href="#pills-report" role="tab" aria-controls="pills-report" aria-selected="true">Raid Stats</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-pve-tab" data-toggle="pill" href="#pills-pve" role="tab" aria-controls="pills-pve" aria-selected="false">PvE Stats</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-pvp-tab" data-toggle="pill" href="#pills-pvp" role="tab" aria-controls="pills-pvp" aria-selected="false">PvP Stats</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-charts-tab" data-toggle="pill" href="#pills-charts" role="tab" aria-controls="pills-charts" aria-selected="false">Charts</a>
				  </li>
				</ul>
				<div class="tab-content" id="pills-tabContent">
					<div class="tab-pane fade show active" id="pills-summary" role="tabpanel" aria-labelledby="pills-summary-tab">
						<h1>SG-E Clan 1 & 2 Leaderboard</h1>
						<hr/>
					`+badges(data)+`
					</div>
				  <div class="tab-pane fade" id="pills-report" role="tabpanel" aria-labelledby="pills-report-tab">
						<h1>SG-E Clan 1 & 2 Raid Stats</h1>
						<h6>Last Updated: `+ moment(raid_data[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically every 30 minutes</h6>
						<br/>
						<h6>
							<small>Stats by <a href="https://raid.report/" target="_blank">https://raid.report/</a></small>
						</h6>
						`+ raidDataTable(raid_data) +`
				  </div>
				  <div class="tab-pane fade" id="pills-pvp" role="tabpanel" aria-labelledby="pills-pvp-tab">
						<h1>SG-E Clan 1 & 2 PVP Stats</h1>
						<h6>Last Updated: `+ moment(pvp_data[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically every 30 minutes</h6>
						<hr/>
						<div>
							<h6>FAQ</h6>
							<ul>
								<li>KD: Is Kills/Deaths.</li>
								<li>KDA: Is (Kills + (Assists / 2)) / Deaths.</li>
								<li>KAD: Is (Kills + Assists) / Deaths. This is found in the in-game emblem and is the "Efficiency" value after games.</li>
							</ul>
							<h6><small>Definitions by <a href="https://destinytracker.com/d2/profile/pc/xenodus-1931" target="_blank">destinytracker</a></small></h6>
						</div>
						`+ pvpDataTable(pvp_data) +`
				  </div>
				  <div class="tab-pane fade" id="pills-charts" role="tabpanel" aria-labelledby="pills-charts-tab">
				  	<div class="container">
				  		<div class="col-md-12">
		  					<div id="raidCompletionChart" class="chart"></div>
	  					</div>
				  		<div class="col-md-12">
		  					<div id="lastLoginChart" class="chart"></div>
	  					</div>
	  				</div>
				  </div>
				  <div class="tab-pane fade" id="pills-pve" role="tabpanel" aria-labelledby="pills-pve-tab">
						<h1>SG-E Clan 1 & 2 PVE Stats</h1>
						<h6>Last Updated: `+ moment(pve_data[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically every 30 minutes</h6>
				  `+pveDataTable(pve_data)+`
				</div>

				<script>
					const memberData = `+JSON.stringify(data.raid)+`;
					const memberPVEData = `+JSON.stringify(data.pve)+`;
					const memberPVPData = `+JSON.stringify(data.pvp)+`;
					const raids = `+JSON.stringify(raids)+`;

					$(document).ready(function(){
						let raid_table = $("#raid_table").DataTable({
							paging: false,
							fixedHeader: true,
			        "columnDefs": [ {
			            "searchable": false,
			            "orderable": false,
			            "targets": 0
			        } ],
			        "order": [[ 1, 'asc' ]]
						});

						let pvp_table = $("#pvp_table").DataTable({
							paging: false,
							fixedHeader: true,
			        "columnDefs": [ {
			            "searchable": false,
			            "orderable": false,
			            "targets": 0
			        } ],
			        "order": [[ 1, 'asc' ]]
						});

						let pve_table = $("#pve_table").DataTable({
							paging: false,
							fixedHeader: true,
			        "columnDefs": [ {
			            "searchable": false,
			            "orderable": false,
			            "targets": 0
			        } ],
			        "order": [[ 1, 'asc' ]]
						});

				    raid_table.on( 'order.dt search.dt', function () {
				        raid_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
				            cell.innerHTML = i+1;
				        } );
				    } ).draw();

				    pvp_table.on( 'order.dt search.dt', function () {
				        pvp_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
				            cell.innerHTML = i+1;
				        } );
				    } ).draw();

				    pve_table.on( 'order.dt search.dt', function () {
				        pve_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
				            cell.innerHTML = i+1;
				        } );
				    } ).draw();

						google.charts.load('current', {'packages':['corechart']});

						$("a[href='#pills-charts']").on('shown.bs.tab', function (e) {
							raidCompletionCharts();
							lastLoginCharts();
						});

						$("a[href='#pills-pve']").on('shown.bs.tab', function (e) {
							raid_table.fixedHeader.disable();
							pvp_table.fixedHeader.disable();
							pve_table.fixedHeader.enable();
							pve_table.fixedHeader.adjust();
						});

						$("a[href='#pills-pvp']").on('shown.bs.tab', function (e) {
							raid_table.fixedHeader.disable();
							pve_table.fixedHeader.disable();
							pvp_table.fixedHeader.enable();
							pvp_table.fixedHeader.adjust();
						});

						$("a[href='#pills-report']").on('shown.bs.tab', function (e) {
							pvp_table.fixedHeader.disable();
							pve_table.fixedHeader.disable();
							raid_table.fixedHeader.enable();
							raid_table.fixedHeader.adjust();
						});

						$("a[href='#pills-charts']").on('shown.bs.tab', function (e) {
							pvp_table.fixedHeader.disable();
							pve_table.fixedHeader.disable();
							raid_table.fixedHeader.disable();
						});

						$(window).resize(function(){
							raidCompletionCharts();
						});
					});

					function raidCompletionCharts() {

						let chartData = [
							['Raid', 'Members with at least 1 clear', { role: 'style' }]
						];

						let colors = [
							'#FFFF00',
							'#FFFF00',
							'#800080',
							'#800080',
							'#FF0000',
							'#FF0000',
							'#1E90FF',
							'#FF1493',
						];

						Object.keys(raids).forEach(function(raid) {
							let membersWithCompletions = 0;

							for(var i=0; i<memberData.length; i++) {
								if( memberData[i][raids[raid]] > 0 ) {
									membersWithCompletions++;
								}
							}

							chartData.push([raid, membersWithCompletions, colors.shift()]);
						});

					  let chart = new google.visualization.ColumnChart(document.getElementById('raidCompletionChart'));
						let data = google.visualization.arrayToDataTable(chartData);
						let options = {
							title: 'Members with >= 1 completion',
							legend: { position: 'none' },
							hAxis: {
								title: 'Raid'
							},
							vAxis: {
								title: 'Members',
								maxValue: memberData.length
							}
					  };
					  chart.draw(data, options);
					}

					function lastLoginCharts() {

						let last7days = 0;
						let last14days = 0;
						let last21days = 0;
						let last28days = 0;

						for(var i=0; i<memberData.length; i++) {
							memberLastLogin = moment(memberData[i].last_online);
							dayDiff = moment().diff(memberLastLogin, 'days');

							if ( dayDiff <= 7 )
								last7days++
							else if ( dayDiff <= 14 )
								last14days++;
							else if ( dayDiff <= 21 ) {
								last21days++;
							}
							else {
								last28days++;
								// console.log( memberData[i].username );
							}
						}

						let chartData = [
							['Last login', '# of Members'],
							['Last Week', last7days],
							['Two Weeks Ago', last14days],
							['Three Weeks Ago', last21days],
							['Four Weeks Ago & Later', last28days]
						];
					  let chart = new google.visualization.PieChart(document.getElementById('lastLoginChart'));
						let data = google.visualization.arrayToDataTable(chartData);
						let options = {
							title: "Members' Last Login",
							is3D: false,
							slices: {
								1: {offset: 0.2},
								2: {offset: 0.3},
								3: {offset: 0.2},
              }
					  };
					  chart.draw(data, options);
					}
				</script>
			</div>
		</body>
	</html>`;
}

function badges(data) {

	highest_raid_count = data.pve.reduce(function(prev, current){
		return current.raid_count > prev.raid_count ? current : prev;
	});

	highest_pe_count = data.pve.reduce(function(prev, current){
		return current.publicEventsCompleted > prev.publicEventsCompleted ? current : prev;
	});

	highest_activities_count = data.pve.reduce(function(prev, current){
		return current.activitiesCleared > prev.activitiesCleared ? current : prev;
	});

	highest_super_count = data.pve.reduce(function(prev, current){
		return current.weaponKillsSuper > prev.weaponKillsSuper ? current : prev;
	});

	highest_melee_count = data.pve.reduce(function(prev, current){
		return current.weaponKillsMelee > prev.weaponKillsMelee ? current : prev;
	});

	highest_grenade_count = data.pve.reduce(function(prev, current){
		return current.weaponKillsGrenade > prev.weaponKillsGrenade ? current : prev;
	});

	highest_kill_count = data.pve.reduce(function(prev, current){
		return current.kills > prev.kills ? current : prev;
	});

	highest_death_count = data.pve.reduce(function(prev, current){
		return current.deaths > prev.deaths ? current : prev;
	});

	highest_suicide_count = data.pve.reduce(function(prev, current){
		return current.suicides > prev.suicides ? current : prev;
	});

	highest_kd_count = data.pve.reduce(function(prev, current){
		return current.kd > prev.kd ? current : prev;
	});

	highest_glory_count = data.pvp.reduce(function(prev, current){
		return current.glory > prev.glory ? current : prev;
	});

	highest_pvp_kd_count = data.pvp.reduce(function(prev, current){
		return current.kd > prev.kd ? current : prev;
	});

	highest_pvp_kda_count = data.pvp.reduce(function(prev, current){
		return current.kda > prev.kda ? current : prev;
	});

	highest_pvp_kad_count = data.pvp.reduce(function(prev, current){
		return current.kad > prev.kad ? current : prev;
	});

	badgeData = {
		pve: {
			'highest_raid_count' : {
				badgeName: 'Tomb Raider',
				userId: highest_raid_count.bnet_id,
				title: 'Raids Cleared:',
				count: highest_raid_count.raid_count.toLocaleString(),
				color: 'gold',
				icon: 'fas fa-dungeon'
			},
			'highest_pe_count' : {
				badgeName: 'P.E. Teacher',
				userId: highest_pe_count.bnet_id,
				title: 'Public Events Completed:',
				count: highest_pe_count.publicEventsCompleted.toLocaleString(),
				color: 'blue',
				icon: 'fas fa-dumbbell'
			},
			'highest_activities_count' : {
				badgeName: 'Grinder',
				userId: highest_activities_count.bnet_id,
				title: 'Activities Cleared:',
				count: highest_activities_count.activitiesCleared.toLocaleString(),
				color: 'teal',
				icon: 'fas fa-infinity'
			},
			'highest_super_count' : {
				badgeName: 'Superman',
				userId: highest_super_count.bnet_id,
				title: 'Super Kills:',
				count: highest_super_count.weaponKillsSuper.toLocaleString(),
				color: 'red',
				icon: 'fas fa-atom'
			},
			'highest_melee_count' : {
				badgeName: 'Saitama',
				userId: highest_melee_count.bnet_id,
				title: 'Melee Kills:',
				count: highest_melee_count.weaponKillsMelee.toLocaleString(),
				color: 'yellow',
				icon: 'fas fa-fist-raised'
			},
			'highest_grenade_count' : {
				badgeName: 'Grenadier',
				userId: highest_grenade_count.bnet_id,
				title: 'Grenade Kills:',
				count: highest_grenade_count.weaponKillsGrenade.toLocaleString(),
				color: 'green',
				icon: 'fas fa-bomb'
			},
			'highest_kill_count' : {
				badgeName: 'Killmonger',
				userId: highest_kill_count.bnet_id,
				title: 'Kills:',
				count: highest_kill_count.kills.toLocaleString(),
				color: 'purple',
				icon: 'fas fa-khanda'
			},
			'highest_death_count' : {
				badgeName: 'Death Incarnate',
				userId: highest_death_count.bnet_id,
				title: 'Deaths:',
				count: highest_death_count.deaths.toLocaleString(),
				color: 'orange',
				icon: 'fas fa-ghost'
			},
			'highest_suicide_count' : {
				badgeName: 'Suicide Squad',
				userId: highest_suicide_count.bnet_id,
				title: 'Suicides:',
				count: highest_suicide_count.suicides.toLocaleString(),
				color: 'pink',
				icon: 'fas fa-skull'
			},
			'highest_kd_count' : {
				badgeName: 'KD Maestro',
				userId: highest_kd_count.bnet_id,
				title: 'PvE Kill-Death Ratio:',
				count: highest_kd_count.kd.toLocaleString(),
				color: 'blue-dark',
				icon: 'fas fa-balance-scale'
			},
		},

		pvp: {
			'highest_glory_count' : {
				badgeName: 'Serial Killer',
				userId: highest_glory_count.bnet_id,
				title: 'PvP Competitive Glory:',
				count: highest_glory_count.glory.toLocaleString(),
				color: 'green-dark',
				icon: 'fab fa-wolf-pack-battalion'
			},
			'highest_pvp_kd_count' : {
				badgeName: 'Death Dealer',
				userId: highest_pvp_kd_count.bnet_id,
				title: 'PvP Kill-Death Ratio:',
				count: highest_pvp_kd_count.kd.toLocaleString(),
				color: 'silver',
				icon: 'fab fa-wolf-pack-battalion'
			}
		}
	};

	let str = `
	<div class="badge-container">
		<div class="row">
	`;

	for( key in badgeData.pve ) {
		str += `
			<div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
				<div class="main-wrapper">
				  <div class="badge `+badgeData.pve[key].color+`">
				    <div class="circle"> <i class="`+badgeData.pve[key].icon+`"></i></div>
				    <div class="ribbon">`+badgeData.pve[key].badgeName+`</div>
				  </div>
				  <div class="badge-description">
			  		<div class="player">
			  			<strong>`+badgeData.pve[key].userId+`</strong>
			  		</div>
			  		<div class="stat">
			  			`+badgeData.pve[key].title+`<br/>`+badgeData.pve[key].count+`
			  		</div>
			  	</div>
			  </div>
			</div>
		`;
	}

	for( key in badgeData.pvp ) {
		str += `
			<div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
				<div class="main-wrapper">
				  <div class="badge `+badgeData.pvp[key].color+`">
				    <div class="circle"> <i class="`+badgeData.pvp[key].icon+`"></i></div>
				    <div class="ribbon">`+badgeData.pvp[key].badgeName+`</div>
				  </div>
				  <div class="badge-description">
			  		<div class="player">
			  			<strong>`+badgeData.pvp[key].userId+`</strong>
			  		</div>
			  		<div class="stat">
			  			`+badgeData.pvp[key].title+`<br/>`+badgeData.pvp[key].count+`
			  		</div>
			  	</div>
			  </div>
			</div>
		`;
	}

	str += `
		</div>
	</div>`;

	return str;
}

function pveDataTable(rows) {

	/* Headers */
	str = `
	<div class="table-responsive">
		<table id="pve_table" class="display table table-striped">
			<thead>
				<tr>
					<th class="no-sort"></th>
					<th class="text-left">Name / Battle.net ID</th>
					<th class="text-center">Clan</th>
					<th class="text-center">Kills</th>
					<th class="text-center">Deaths</th>
					<th class="text-center">Suicides</th>
					<th class="text-center">KD</th>
					<th class="text-center">Super Kills</th>
					<th class="text-center">Melee Kills</th>
					<th class="text-center">Grenade Kills</th>
					<th class="text-center">Activities Cleared</th>
					<th class="text-center">Raids Cleared</th>
					<th class="text-center">Public Events (PE) Completed</th>
				</tr>
		</thead>
		<tbody>`;

	/* Data */
	for(var i=0; i<rows.length; i++) {
		bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

		str += `
		<tr>
			<td>`+(i+1)+`</td>
			<td class="text-left">`+rows[i].username+bnetId+`</td>
			<td class="text-center">`+rows[i].clan_no+`</td>
			<td class="text-center">`+rows[i].kills.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].deaths.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].suicides.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].kd+`</td>
			<td class="text-center">`+rows[i].weaponKillsSuper.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].weaponKillsMelee.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].weaponKillsGrenade.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].activitiesCleared.toLocaleString()+`</td>
			<td class="text-center">`+rows[i].raid_count+`</td>
			<td class="text-center">`+rows[i].publicEventsCompleted.toLocaleString()+`</td>
		</tr>`;
	}

	str += `
			</tbody>
		</table>
	</div>`;

	return str;
}

function raidDataTable(rows) {

	/* Headers */
	str = `
	<div class="table-responsive">
		<table id="raid_table" class="display table table-striped">
			<thead>
				<tr>
					<th class="no-sort"></th>
					<th class="text-left">Name / Battle.net ID</th>
					<th class="text-center">Clan</th>
					<th class="text-left">Last Login</th>`;

	Object.keys(raids).forEach(function(raid) {
		str += `<th class="text-nowrap">`+raid+`</th>`;
	});

	str += `<th class="text-nowrap">Total</th>`;
	str +=
			`</tr>
		</thead>
	<tbody>`;

	/* Data */
	for(var i=0; i<rows.length; i++) {
		bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

		str += `
		<tr>
			<td>`+(i+1)+`</td>
			<td class="text-left">`+rows[i].username+bnetId+`</td>
			<td class="text-center">`+rows[i].clan_no+`</td>
			<td data-sort="`+moment(rows[i].last_online).unix()+`" class="text-nowrap text-left">`+moment(rows[i].last_online).format("DD MMM YYYY")+`</td>`;

		let activityCount = 0;

		Object.keys(raids).forEach(function(raid) {
			str += `<td class="text-center">`+rows[i][raids[raid]]+`</td>`;
			activityCount+= rows[i][raids[raid]];
		});

		str += `<td class="text-center">`+activityCount+`</td>`;
		str += `</tr>`;
	}

	str += `
			</tbody>
		</table>
	</div>`;

	return str;
}

function discordDataTable(rows) {

	let membersNamesNoMatch = rows
	.filter(function(member){
		return member.bnet_id !== '';
	})
	.filter(function(member){
		return member.discord_nickname === null || (member.bnet_id && member.discord_nickname && member.bnet_id.toLowerCase() != member.discord_nickname.toLowerCase());
	})

	/* Headers */
	if( membersNamesNoMatch.length > 0 ) {
		str = `
		<div class="table-responsive">
			<table id="discord_table" class="display table table-striped">
				<thead>
					<tr>
						<th class="no-sort"></th>
						<th class="text-nowrap text-left">Destiny Name</th>
						<th class="text-nowrap text-left">BNet ID</th>
						<th class="text-nowrap text-center">Clan</th>
					</tr>
			</thead>
		<tbody>`;

		for(var i=0; i<membersNamesNoMatch.length; i++) {
			str += `
			<tr>
				<td>`+(i+1)+`</td>
				<td class="text-left">`+membersNamesNoMatch[i].username+`</td>
				<td class="text-left">`+membersNamesNoMatch[i].bnet_id+`</td>
				<td class="text-center">`+membersNamesNoMatch[i].clan_no+`</td>
			</tr>
			`;
		}

		str += `
				</tbody>
			</table>
		</div>`;
	}
	else {
		str = `<div>Woo-hoo! No members are MIA!</div>`;
	}

	// Members whose BNet ID can't be retrieved due to privacy settings - weirdos
	let membersNamesNoBNet = rows
	.filter(function(member){
		return member.bnet_id == '';
	})
	.map(function(member){
		return member.username;
	});

	if( membersNamesNoBNet.length > 0 ) {
		str += `<br/><div><h5>Unable to check the following members due to Battle.net privacy settings: `+membersNamesNoBNet.join(', ')+`<h5></div>`;
	}

	return str;
}

function pvpDataTable(rows) {

	/* Headers */
	str = `
	<div class="table-responsive">
		<table id="pvp_table" class="display table table-striped">
			<thead>
				<tr>
					<th class="no-sort"></th>
					<th class="text-left">Name / Battle.net ID</th>
					<th class="text-nowrap text-center">Clan</th>
					<th class="text-nowrap text-right">KD</th>
					<th class="text-nowrap text-right">KDA</th>
					<th class="text-nowrap text-right">KAD</th>
					<th class="text-nowrap text-right">Glory</th>
					<th class="text-nowrap text-right">Valor</th>
					<th class="text-nowrap text-right">Infamy</th>
					<th class="text-right">Highest Game Kills</th>
					<th class="text-right">Highest Game Score</th>
				</tr>
		</thead>
	<tbody>`;

	/* Data */
	for(var i=0; i<rows.length; i++) {

		bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;
		glory_rank = rows[i].glory_step == gloryRanks.length ? gloryRanks[gloryRanks.length-1] : gloryRanks[ rows[i].glory_step ];
		valor_rank = rows[i].valor_step == valorRanks.length ? valorRanks[valorRanks.length-1] : valorRanks[ rows[i].valor_step ];
		infamy_rank = rows[i].infamy_step == infamyRanks.length ? infamyRanks[infamyRanks.length-1] : infamyRanks[ rows[i].infamy_step ];

		str += `
		<tr>
			<td>`+(i+1)+`</td>
			<td class="text-left">`+rows[i].username+bnetId+`</td>
			<td class="text-center">`+rows[i].clan_no+`</td>
			<td class="text-right">`+rows[i].kd+`</td>
			<td class="text-right">`+rows[i].kda+`</td>
			<td class="text-right">`+rows[i].kad+`</td>
			<td class="text-right" data-sort="`+rows[i].glory+`">`+rows[i].glory.toLocaleString()+`<div style="margin-top: 5px;" class="rank-`+glory_rank.split(" ").join("").toLowerCase()+`"><small>`+glory_rank+`</small></div></td>
			<td class="text-right" data-sort="`+rows[i].valor+`">`+rows[i].valor.toLocaleString()+`<div style="margin-top: 5px;" class="rank-`+valor_rank.split(" ").join("").toLowerCase()+`"><small>`+valor_rank+`</small></div></td>
			<td class="text-right" data-sort="`+rows[i].infamy+`">`+rows[i].infamy.toLocaleString()+`<div style="margin-top: 5px;" class="rank-`+infamy_rank.split(" ").join("").toLowerCase()+`"><small>`+infamy_rank+`</small></div></td>
			<td class="text-right">
				<a href="https://www.bungie.net/en/PGCR/`+rows[i].bestSingleGameKills_activityID+`" target="_blank">`+rows[i].bestSingleGameKills+`</a>
			</td>
			<td class="text-right">
				<a href="https://www.bungie.net/en/PGCR/`+rows[i].bestSingleGameScore_activityID+`" target="_blank">`+rows[i].bestSingleGameScore+`</a>
			</td>
		</tr>`;
	}

	str += `
			</tbody>
		</table>
	</div>`;

	return str;
}
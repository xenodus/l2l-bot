const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");

const express = require('express');
const app = express();
const port = 8082;

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

app.get('/', async function(req, res){
	rr_results = await pool.query("SELECT * FROM clan_raid_report");
	pvp_results = await pool.query("SELECT * FROM clan_pvp_stats");
	await res.write( simpleHTML( rr_results, pvp_results ) ); //write a response to the client
	await res.end(); //end the response
});

app.listen(port, () => console.log(`SGE ClanRR listening on port ${port}!`));

function simpleHTML(results, pvp_results) {

	var rows = JSON.parse(JSON.stringify(results));
	var pvp_rows = JSON.parse(JSON.stringify(pvp_results));

	return `<html>
		<head>
			<title>SG-E Clan 1 & 2 Raid Report</title>
			<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.6/umd/popper.min.js" integrity="sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut" crossorigin="anonymous"></script>
			<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.css">
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.js"></script>
			<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
			<script type="text/javascript" src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>
			<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.23.0/moment.min.js"></script>
			<!-- Datatables Fixed Headers -->
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/fixedheader/3.1.5/js/dataTables.fixedHeader.min.js"></script>
			<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/fixedheader/3.1.5/css/fixedHeader.bootstrap4.min.css">
			<style>
			.chart {
				min-height: 450px;
			}
			table {
				font-size: 13px;
			}
			[class^="rank-guardian"] {
				color: black;
			}
			[class^="rank-brave"] {
				color: green;
			}
			[class^="rank-heroic"] {
				color: blue;
			}
			[class^="rank-fabled"] {
				color: purple;
			}
			[class^="rank-mythic"] {
				color: #C71585;
			}
			[class^="rank-legend"] {
				color: orange;
			}
			.bnet_id {
				margin-top: 5px;
				color: #4169E1;
				display: block;
			}
			</style>
		</head>
		<body style="padding: 30px;">
			<div class="container">

				<ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
				  <li class="nav-item">
				    <a class="nav-link active" id="pills-report-tab" data-toggle="pill" href="#pills-report" role="tab" aria-controls="pills-report" aria-selected="true">Raid Stats</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-pvp-tab" data-toggle="pill" href="#pills-pvp" role="tab" aria-controls="pills-pvp" aria-selected="false">PvP Stats</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-charts-tab" data-toggle="pill" href="#pills-charts" role="tab" aria-controls="pills-charts" aria-selected="false">Charts</a>
				  </li>
				</ul>
				<div class="tab-content" id="pills-tabContent">
				  <div class="tab-pane fade show active" id="pills-report" role="tabpanel" aria-labelledby="pills-report-tab">
						<h1>SG-E Clan 1 & 2 Raid Stats</h1>
						<h6>Last Updated: `+ moment(rows[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically every 3 hours</h6>
						<br/>
						<h6>
							<small>Stats by <a href="https://raid.report/" target="_blank">https://raid.report/</a></small>
						</h6>
						`+ rrDataTable(rows) +`
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
				  <div class="tab-pane fade" id="pills-pvp" role="tabpanel" aria-labelledby="pills-pvp-tab">
						<h1>SG-E Clan 1 & 2 PVP Stats</h1>
						<h6>Last Updated: `+ moment(pvp_rows[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically every 3 hours</h6>
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
						`+ pvpDataTable(pvp_rows) +`
				  </div>
				</div>

				<script>
					const memberData = `+JSON.stringify(results)+`;
					const memberPVPData = `+JSON.stringify(pvp_results)+`;
					const raids = `+JSON.stringify(raids)+`;

					$(document).ready(function(){
						let rr_table = $("#rr_table").DataTable({
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

				    rr_table.on( 'order.dt search.dt', function () {
				        rr_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
				            cell.innerHTML = i+1;
				        } );
				    } ).draw();

				    pvp_table.on( 'order.dt search.dt', function () {
				        pvp_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
				            cell.innerHTML = i+1;
				        } );
				    } ).draw();

						google.charts.load('current', {'packages':['corechart']});

						$("a[href='#pills-charts']").on('shown.bs.tab', function (e) {
							raidCompletionCharts();
							lastLoginCharts();
						});

						$("a[href='#pills-pvp']").on('shown.bs.tab', function (e) {
							rr_table.fixedHeader.disable();
							pvp_table.fixedHeader.enable();
							pvp_table.fixedHeader.adjust();
						});

						$("a[href='#pills-report']").on('shown.bs.tab', function (e) {
							pvp_table.fixedHeader.disable();
							rr_table.fixedHeader.enable();
							rr_table.fixedHeader.adjust();
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

function rrDataTable(rows) {

	/* Headers */
	str = `
	<div class="table-responsive">
		<table id="rr_table" class="display table table-striped">
			<thead>
				<tr>
					<th class="no-sort"></th>
					<th class="text-nowrap text-left">Name / Battle.net ID</th>
					<th class="text-nowrap text-center">Clan</th>
					<th class="text-nowrap text-left">Last Login</th>`;

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
					<th class="text-nowrap text-left">Name / Battle.net ID</th>
					<th class="text-nowrap text-center">Clan</th>
					<th class="text-nowrap text-right">KD</th>
					<th class="text-nowrap text-right">KDA</th>
					<th class="text-nowrap text-right">KAD</th>
					<th class="text-nowrap text-right">Glory</th>
					<th class="text-nowrap text-right">Valor</th>
					<th class="text-nowrap text-right">Infamy</th>
					<th class="text-nowrap text-right">Highest Game Kills</th>
					<th class="text-nowrap text-right">Highest Game Score</th>
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
			<td class="text-right" data-sort="`+rows[i].glory+`">`+rows[i].glory+`<div style="margin-top: 5px;" class="rank-`+glory_rank.split(" ").join("").toLowerCase()+`"><small>`+glory_rank+`</small></div></td>
			<td class="text-right" data-sort="`+rows[i].valor+`">`+rows[i].valor+`<div style="margin-top: 5px;" class="rank-`+valor_rank.split(" ").join("").toLowerCase()+`"><small>`+valor_rank+`</small></div></td>
			<td class="text-right" data-sort="`+rows[i].infamy+`">`+rows[i].infamy+`<div style="margin-top: 5px;" class="rank-`+infamy_rank.split(" ").join("").toLowerCase()+`"><small>`+infamy_rank+`</small></div></td>
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
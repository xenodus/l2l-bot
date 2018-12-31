const config = require('./config').production;
const pool = config.getPool();
const moment = require("moment");

const express = require('express');
const app = express();
const port = 8080;

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

app.get('/', function(req, res){
	pool.query("SELECT * FROM clan_raid_report")
	.then(async function(results){
		await res.write( simpleHTML( results ) ); //write a response to the client
  	await res.end(); //end the response
	});
});

app.listen(port, () => console.log(`SGE ClanRR listening on port ${port}!`));

function simpleHTML(results) {

	var rows = JSON.parse(JSON.stringify(results));

	return `<html>
		<head>
			<title>SG-E Clan 1 & 2 Raid Report</title>
			<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.6/umd/popper.min.js" integrity="sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut" crossorigin="anonymous"></script>
			<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.css">
			<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.js"></script>
			<script type="text/javascript" charset="utf8" src="https:////cdn.datatables.net/plug-ins/1.10.19/type-detection/date-uk.js"></script>
			<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
			<script type="text/javascript" src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>
			<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.23.0/moment.min.js"></script>
			<style>
			.chart {
				min-height: 450px;
			}
			table {
				font-size: 14px;
			}
			</style>
		</head>
		<body style="padding: 30px;">
			<div class="container">

				<ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
				  <li class="nav-item">
				    <a class="nav-link active" id="pills-report-tab" data-toggle="pill" href="#pills-report" role="tab" aria-controls="pills-report" aria-selected="true">Raid Report</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-charts-tab" data-toggle="pill" href="#pills-charts" role="tab" aria-controls="pills-charts" aria-selected="false">Charts</a>
				  </li>
				  <li class="nav-item">
				    <a class="nav-link" id="pills-contact-tab" data-toggle="pill" href="#pills-contact" role="tab" aria-controls="pills-contact" aria-selected="false"></a>
				  </li>
				</ul>
				<div class="tab-content" id="pills-tabContent">
				  <div class="tab-pane fade show active" id="pills-report" role="tabpanel" aria-labelledby="pills-report-tab">
						<h1>SG-E Clan 1 & 2 Raid Report</h1>
						<h6>Last Updated: `+ moment(rows[0].last_updated).format("DD MMM YYYY h:mm A") +` &bull; List updates automatically daily between 5 to 6 PM</h6>`
						+ dataTable(rows) +`
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
				  <div class="tab-pane fade" id="pills-contact" role="tabpanel" aria-labelledby="pills-contact-tab">...</div>
				</div>

				<script>
					const memberData = `+JSON.stringify(results)+`;
					const raids = `+JSON.stringify(raids)+`;

					$(document).ready(function(){
						$("#rr_table").DataTable({ paging: false });
						google.charts.load('current', {'packages':['corechart']});

						$("a[href='#pills-charts']").on('shown.bs.tab', function (e) {
							raidCompletionCharts();
							lastLoginCharts();
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
							title: 'Members with >= 1 completion'
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
								console.log( memberData[i].username );
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
							title: "Members' Last Login"
					  };
					  chart.draw(data, options);
					}
				</script>
			</div>
		</body>
	</html>`;
}

function dataTable(rows) {

	/* Headers */
	str = `
	<table id="rr_table" class="display table table-striped table-responsive">
		<thead>
			<tr>
				<th class="text-nowrap">Display Name</th>
				<th class="text-nowrap">BNet ID</th>
				<th class="text-nowrap">Last Login</th>`;

	Object.keys(raids).forEach(function(raid) {
		str += `<th class="text-nowrap">`+raid+`</th>`;
	});

	str +=
			`</tr>
		</thead>
	<tbody>`;

	/* Data */
	for(var i=0; i<rows.length; i++) {
		str += `
		<tr>
			<td>`+rows[i].username+`
			</td><td>`+rows[i].bnet_id+`</td>
			<td data-sort="`+moment(rows[i].last_online).unix()+`" class="text-nowrap">`+moment(rows[i].last_online).format("DD MMM YYYY")+`</td>`;

		Object.keys(raids).forEach(function(raid) {
			str += `<td class="text-center">`+rows[i][raids[raid]]+`</td>`;
		});

		str += `</tr>`;
	}

	str += `
		</tbody>
	</table>`;

	return str;
}
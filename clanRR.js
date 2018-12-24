var http = require('http');
const config = require('./config').production;
const pool = config.getPool();
const moment = require("moment");

//create a server object:
http.createServer(function (req, res) {

	pool.query("SELECT * FROM clan_raid_report")
	.then(async function(results){
		await res.write( simpleHTML( results ) ); //write a response to the client
  	await res.end(); //end the response
	})
}).listen(8080); //the server object listens on port 8080

function simpleHTML(results) {

	var rows = JSON.parse(JSON.stringify(results));

	return '<html>' +
		'<head>' +
			'<title>SG-E Clan 1 & 2 Raid Report</title>' +
			'<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>' +
			'<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.6/umd/popper.min.js" integrity="sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut" crossorigin="anonymous"></script>' +
			'<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.css">' +
			'<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.js"></script>' +
			'<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">' +
			'<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>' +
		'</head>' +
		'<body style="padding: 30px;">' +
		'<h1>SG-E Clan 1 & 2 Raid Report</h1>' +
		'<h6>Last Updated: ' + moment(rows[0].last_updated).format("DD MMM YYYY h:mm A") + '</h6>' +
		dataTable(rows) +
		'<script>$(document).ready(function(){$("#rr_table").DataTable({ paging: false })});</script>' +
		'</body>' +
	'</html>';
}

function dataTable(rows) {
	str = '<table id="rr_table" class="display">';
	str += '<thead><tr><th>Username</th><th>BNet ID</th><th>Levi</th><th>Levi Pres.</th><th>EOW</th><th>EOW Pres.</th><th>SOS</th><th>SOS Pres.</th><th>LW</th><th>SOTP</th></tr></thead>';
	str += '<tbody>';

	for(var i=0; i<rows.length; i++) {
		str += '<tr><td>'+rows[i].username+'</td><td>'+rows[i].bnet_id+'</td><td>'+rows[i].levi+'</td><td>'+rows[i].levip+'</td><td>'+rows[i].eow+'</td><td>'+rows[i].eowp+'</td><td>'+rows[i].sos+'</td><td>'+rows[i].sosp+'</td><td>'+rows[i].lw+'</td><td>'+rows[i].sotp+'</td></tr>';
	}

	str += '</tbody>';
	str += '</table>';

	return str;
}
$(document).ready(function(){

  $.get("api/members", function(data){

    $('.roster-container').removeClass("spinner").html( rosterDataTable(data) );
    $("#roster_table").addClass("bg-white text-dark");

    let roster_table = $("#roster_table").DataTable({
      paging: true,
      fixedHeader: true,
      pageLength: 50,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 1, 'asc' ]]
    });

    roster_table.on( 'order.dt search.dt', function () {
        roster_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();
  });
});

function rosterDataTable(rows) {
  rows = JSON.parse(rows);

  if( rows.length <= 0 )
    return '';

  /* Headers */
  str = `
  <div class="table-responsive">
    <table id="roster_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name</th>
          <th class="text-left">Clan</th>
          <th class="text-left">Last Online</th>
        </tr>
    </thead>
  <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {
    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].username+`<div class="bnet_id"><small>`+rows[i].bnet_id+`</small></div></td>
      <td class="text-left">`+rows[i].clan_no+`</td>
      <td class="text-left" data-sort="`+moment(rows[i].last_online).unix()+`">`+moment(rows[i].last_online).format("DD MMM YYYY")+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}
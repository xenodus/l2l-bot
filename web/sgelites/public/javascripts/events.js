$(document).ready(function(){

  $("#events-table-container").addClass("spinner");

  $.get("api/events", function(data){
      $("#events-table-container").removeClass("spinner");
      $("#events-table-container").html( eventDatatable(data) );
      $("#events_table").addClass("bg-white text-dark");
  });
});

function eventDatatable(events) {
  events = JSON.parse(events);

  if( events.length <= 0 )
    return 'No events have been scheduled.';

  /* Headers */
  var str = `
  <div class="table-responsive">
    <table id="events_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-center">Title</th>
          <th class="text-center">Description</th>
          <th class="text-center">Date</th>
          <th class="text-center">Confirmed</th>
          <th class="text-center">Reserve</th>
          <th class="text-center">Creator</th>
        </tr>
    </thead>
    <tbody>`;

    for(var i=0; i<events.length;i++) {
      str += `
      <tr>
        <td>`+(i+1)+`</td>
        <td>`+events[i].event_name+`</td>
        <td>`+events[i].event_description+`</td>
        <td data-sort="`+moment(events[i].event_date).unix()+`" class="text-nowrap text-left">`+moment(events[i].event_date).format("DD MMM YYYY")+`</td>
        <td class="text-center">`+events[i].confirmed+`</td>
        <td class="text-center">`+events[i].reserve+`</td>
        <td>`+events[i].created_by_username+`</td>
      </tr>
        `;
    }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}
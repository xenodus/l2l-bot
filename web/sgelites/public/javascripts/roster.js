$(document).ready(function(){

  $.get("api/members", function(data){

    $.get("api/characters", function(charData){

      $('.roster-container').removeClass("spinner").html( rosterDataTable(data, charData) );
      $("#roster_table").addClass("bg-white text-dark");

      var roster_table = $("#roster_table").DataTable({
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
});

function rosterDataTable(data, charData) {
  data = JSON.parse(data);
  charData = JSON.parse(charData);

  if( data.length <= 0 )
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
          <th class="text-center">Characters</th>
          <th class="text-left">Last Online</th>
        </tr>
    </thead>
  <tbody>`;

  /* Data */
  for(var i=0; i<data.length; i++) {

    var characters = charData.filter(function(character){
      return character.user_id == data[i].destiny_id;
    });

    var dataSortSearchStr = '';
    var characterStr = '';

    if( characters.length > 0  ) {
      var memberCharacters = {
        Warlock: characters.filter(function(character){ return character.class == 'Warlock'; }),
        Hunter: characters.filter(function(character){ return character.class == 'Hunter'; }),
        Titan: characters.filter(function(character){ return character.class == 'Titan'; })
      };

      characterStr = '';
      dataSortSearchStr = '';

      for( var index in Object.keys( memberCharacters ) ) {
        guardianClass = Object.keys( memberCharacters )[index];

       if( memberCharacters[guardianClass].length <= 0 ) {
          characterStr += `
            <div class="d-flex flex-column justify-content-center">
              <div class="character ml-1 mr-2 d-flex justify-content-center align-items-center text-white" style="background: rgba(0,0,0,1);">
                <i class="fas fa-frown-open fa-lg"></i>
              </div>
              <div class="text-center"><small>`+guardianClass+`</small></div>
            </div>`;
        }
        else {
          dataSortSearchStr += guardianClass + " ";
          background = memberCharacters[guardianClass][0].emblemPath ? 'background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://bungie.net'+memberCharacters[guardianClass][0].emblemPath+');' : 'background: #000;';
          characterStr += `
            <div class="d-flex flex-column justify-content-center">
              <a href="https://www.bungie.net/en/Gear/4/`+memberCharacters[guardianClass][0].user_id+`/`+memberCharacters[guardianClass][0].character_id+`" target="_blank" class="text-decoration-none ml-1 mr-2 border border-2 border-warning">
                <div class="character d-flex flex-column justify-content-center align-items-center" style="`+background+`">
                  <div class="light text-white font-weight-bold">`+memberCharacters[guardianClass][0].light+`</div>
                  <div class="level text-white">Level `+memberCharacters[guardianClass][0].level+`</div>
                </div>
              </a>
              <div class="text-center"><small>`+guardianClass+`</small></div>
            </div>`;
        }
      }
    }
    else
      characterStr += '';

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+data[i].display_name+`<div class="bnet_id"><small>`+data[i].bnet_id+`</small></div></td>
      <td class="text-left">`+data[i].clan_no+`</td>
      <td class="text-left" data-search="`+dataSortSearchStr+`" data-sort="`+characters.length+`">
        <div class="d-flex justify-content-center">
          `+characterStr+`
        </div>
      </td>
      <td class="text-left" data-sort="`+moment(data[i].last_online).unix()+`">`+moment(data[i].last_online).format("DD MMM YYYY")+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}
$(document).ready(function(){
  var hash = window.location.hash;
  hash && $('ul.nav.nav-pills a[href="' + hash + '"]').tab('show');
  $('ul.nav.nav-pills a').click(function (e) {
     $(this).tab('show');
     var scrollmem = $('body').scrollTop();
     window.location.hash = this.hash;
  });

  $.get("api/live/clan/online", function(data){
    var members_online = 0;

    try {
      data = JSON.parse(data);
      members_online = Object.values(data).map(function(clan){ return clan.online; }).reduce((prev, next) => prev + next);
    }
    catch(e) {
      console.log('No members online.');
    }

    if( members_online > 0 ) {
      $('.status-bar').append("<span><i class='fas fa-circle fa-sm mr-2 text-success'></i>"+members_online+" Members Online</span>").show();
    }
  });
});
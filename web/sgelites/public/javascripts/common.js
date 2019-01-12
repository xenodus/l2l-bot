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
      $('.main-container').prepend("<div class='text-white text-right mt-3 mr-3 members-online' style='letter-spacing: 1px;'><i class='fas fa-circle fa-sm mr-2 text-success'></i>"+members_online+" Members Online</div>");
    }
  });
});
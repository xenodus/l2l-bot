$(document).ready(function(){
  var hash = window.location.hash;
  hash && $('ul.nav.nav-pills a[href="' + hash + '"]').tab('show');
  $('ul.nav.nav-pills a').click(function (e) {
     $(this).tab('show');
     var scrollmem = $('body').scrollTop();
     window.location.hash = this.hash;
  });
});
$(document).ready(function(){

  $.get('/api/vendor', function(data){

    $('.home-vendor-container .row').removeClass('spinner');

    var vendorHash = {
      'Suraya Hawthorne': '3347378076',
      'Ada-1': '2917531897',
      'Banshee-44': '672118013',
      'Spider': '863940356',
      'Lord Shaxx': '3603221665',
      'The Drifter': '248695599',
      'Lord Saladin': '895295461',
      'Commander Zavala': '69482069',
      'Xur': '2190858386',
      'Tess Everis': '3361454721'
    };

    var gambitBountiesFilter = [
      'Gambit Bounty',
      'Weekly Drifter Bounty'
    ];

    var tessFilter = [
      'Emote',
      'Ghost Shell',
      'Ship',
      'Transmat Effect',
      'Vehicle',
      'Weapon Ornament',
      'Armor Ornament'
    ];

    data = JSON.parse(data);

    if( data.length > 0 ) {
      raid_bounties = data.filter(function(item){ return item.vendor_hash == vendorHash['Suraya Hawthorne'] && item.itemTypeDisplayName == 'Weekly Bounty' });

      gambit_bounties = data.filter(function(item){ return item.vendor_hash == vendorHash['The Drifter'] && gambitBountiesFilter.includes(item.itemTypeDisplayName) });

      spider_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Spider'] && item.itemTypeDisplayName == '' });

      spider_powerful_bounty = data.filter(function(item){ return item.vendor_hash == vendorHash['Spider'] && item.itemTypeDisplayName == 'Weekly Bounty' && item.icon == '/common/destiny2_content/icons/ec18be1d4459f3747a06fa5c34342a17.jpg' });

      banshee_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Banshee-44'] && item.icon != '' });

      xur_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Xur'] && item.itemTypeDisplayName != 'Challenge Card' });

      tess_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Tess Everis'] && tessFilter.includes(item.itemTypeDisplayName) });

      if( raid_bounties.length > 0 ) {
        $('.left-col').append( getVendorStr(raid_bounties, 'Weekly Raid ' + (raid_bounties.length > 1 ? 'Bounties' : 'Bounty') ) );
      }

      if( gambit_bounties.length > 0 ) {
        $('.left-col').append( getVendorStr(gambit_bounties, 'Gambit Bounties') );
      }

      if( spider_powerful_bounty.length > 0 ) {
        $('.left-col').append( getVendorStr(spider_powerful_bounty, 'Spider\'s Powerful Bounty') );
      }

      if( banshee_wares.length > 0 ) {
        $('.mid-col').append( getVendorStr(banshee_wares, 'Banshee-44\'s Mods') );
      }

      if( spider_wares.length > 0 ) {
        $('.mid-col').append( getVendorStr(spider_wares, 'Spider\'s Wares') );
      }

      if( xur_wares.length > 0 ) {
        $('.right-col').append( getVendorStr(xur_wares, 'Xur\'s Shinies <small style="font-size: 60%;font-style: italic;"><a href="https://whereisxur.com/" target="_blank">Where is Xur?</a></small>') );
      }

      if( tess_wares.length > 0 ) {
        $('.right-col').append( getVendorStr(tess_wares, 'Tess\'s Shinies') );
      }

      $('[data-toggle="tooltip"]').tooltip();
    }
  })

  $.get('/api/stats/online', function(onlineData){
    onlineData = JSON.parse(onlineData);

    $('#onlineHistory').removeClass('spinner');

    var online_data = onlineData.map(function(date){ return date.no_online; });
    var online_dates = onlineData.map(function(date){ return date.datetime });
    var labels = onlineData.map(function(date){ return moment(date.datetime).format('ha'); });

    var onlineHistoryCanvas = document.getElementById('onlineHistory').getContext('2d');
    var onlineHistoryChart = new Chart(onlineHistoryCanvas,{
        type: 'line',
        data: {
          datasets: [{
              data: online_data,
              backgroundColor: 'rgba(255,255,255,0)',
              borderColor: 'rgba(255,255,255,0.7)',
              lineTension: 0,
              borderWidth: 1,
              pointBorderWidth: 2,
              pointStyle: 'circle'
          }],
          labels: labels
        },
        options: {
          maintainAspectRatio: false,
          title: {
            display: false,
            text: 'Clan Activity',
            padding: 30,
            fontColor: 'white'
          },
          legend: {
            display: false
          },
          scales: {
            xAxes: [{
              gridLines: {
                display: false,
                color: 'rgba(255,255,255,0.1)',
              },
              ticks: {
                fontColor: 'rgba(255,255,255,0.5)'
              },
              scaleLabel: {
                display: false,
                labelString: 'Time',
                fontColor: 'rgba(255,255,255,0.5)'
              }
            }],
            yAxes: [{
              gridLines: {
                display: false,
                color: 'rgba(255,255,255,0.1)'
              },
              ticks: {
                fontColor: 'rgba(255,255,255,0.5)'
              },
              scaleLabel: {
                display: false,
                labelString: 'Members Online',
                fontColor: 'rgba(255,255,255,0.5)'
              }
            }]
          },
          tooltips: {
            displayColors: false,
            callbacks: {
              title: function(tooltipItem, data) {
                return online_data[tooltipItem[0]['index']] + ' Members';
              },
              label: function(tooltipItem, data) {
                return moment( online_dates[tooltipItem['index']] ).format('D MMM YYYY, ddd h A')
              }
            }
          }
        },
    });
  });

  function getVendorStr(data, title) {
    str = `
    <div class="mb-3 border-warning border">
      <div class="border-warning border-bottom p-2">`+title+`</div>
      <div class="pl-2 pr-2 pt-2 pb-1">
    `;

    for(var i=0; i<data.length; i++) {
      str += `
      <div class="d-flex mb-1 vendor-item" data-toggle="tooltip" title="`+data[i].description+`">
        <img class="img-fluid" src="https://bungie.net`+data[i].icon+`" style="width: 20px; height: 20px; margin-right: 5px;"/>`+data[i].name+`
      </div>
      `;
    }

    str += `
      </div>
    </div>
    `
    return str;
  }
});
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

    var spiderRareBounty = [
      'WANTED: Combustor Valus',
      'WANTED: Arcadian Chord',
      'WANTED: The Eye in the Dark',
      'WANTED: Gravetide Summoner',
      'WANTED: Silent Fang',
      'WANTED: Blood Cleaver'
    ];

    data = JSON.parse(data);

    if( data.length > 0 ) {
      raid_bounties = data.filter(function(item){ return item.vendor_hash == vendorHash['Suraya Hawthorne'] && item.itemTypeDisplayName == 'Weekly Bounty' });

      gambit_bounties = data.filter(function(item){ return item.vendor_hash == vendorHash['The Drifter'] && gambitBountiesFilter.includes(item.itemTypeDisplayName) });

      spider_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Spider'] && item.itemTypeDisplayName == '' });

      spider_powerful_bounty = data.filter(function(item){ return item.vendor_hash == vendorHash['Spider'] && item.itemTypeDisplayName == 'Weekly Bounty' && spiderRareBounty.includes(item.name) });

      banshee_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Banshee-44'] && item.icon != '' });

      xur_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Xur'] && item.itemTypeDisplayName != 'Challenge Card' });

      tess_wares = data.filter(function(item){ return item.vendor_hash == vendorHash['Tess Everis'] && tessFilter.includes(item.itemTypeDisplayName) });

      saladin_bounties = data.filter(function(item){ return item.vendor_hash == vendorHash['Lord Saladin'] && item.itemTypeDisplayName == 'Iron Banner Bounty' });

      if( raid_bounties.length > 0 ) {
        $('.left-col').append( getVendorStr(raid_bounties, 'Weekly Raid & Clan ' + (raid_bounties.length > 1 ? 'Bounties' : 'Bounty') ) );
      }

      ascendant_challenge = getAscendantChallenge();
      weekly_dc_mission = getWeeklyDCMission();
      curse_level = getCurseLevel();

      if( ascendant_challenge.length > 0 && weekly_dc_mission.length > 0  && curse_level.length > 0 ) {
        $('.left-col').prepend( getVendorStr( ascendant_challenge.concat(weekly_dc_mission).concat(curse_level) , 'Dreaming City') );
      }

      if( gambit_bounties.length > 0 ) {
        $('.left-col').append( getVendorStr(gambit_bounties, 'Gambit Bounties') );
      }

      if( banshee_wares.length > 0 ) {
        $('.mid-col').append( getVendorStr(banshee_wares, 'Banshee-44\'s Mods') );
      }

      if( spider_powerful_bounty.length > 0 ) {
        $('.mid-col').append( getVendorStr(spider_powerful_bounty, 'Spider\'s Powerful Bounty') );
      }

      if( spider_wares.length > 0 ) {
        $('.mid-col').append( getVendorStr(spider_wares, 'Spider\'s Wares') );
      }

      escalation_protocol = getEscalationProtocol();

      if( escalation_protocol.length > 0  ) {
        $('.mid-col').append( getVendorStr( escalation_protocol, 'Escalation Protocol') );
      }

      if( xur_wares.length > 0 ) {
        $('.right-col').append( getVendorStr(xur_wares, 'Xur\'s Shinies <small style="font-size: 60%;font-style: italic;"><a href="https://whereisxur.com/" target="_blank">Where is Xur?</a></small>') );
      }

      if( saladin_bounties.length > 0 ) {
        // $('.right-col').append( getVendorStr(saladin_bounties, 'Lord Salad\'s Bounties') );
      }

      // Prestige: Gladiator - "Melee kills buff weapon damage, and weapon kills buff melee damage." - https://bungie.net/common/destiny2_content/icons/8d4cc5b8420f2a647c877610b9f286ed.png
      // Prestige: Arsenal - "Weapons have no reserve ammo. Emptying the clip of a weapon refills the clips of your holstered weapons." - https://bungie.net/common/destiny2_content/icons/5e870c7f571cf35554183a9b330cbf23.png
      // Prism - "Attacks matching the periodically rotating focused element do more damage. Other elemental damage is reduced. Incoming damage is unaffected." - https://bungie.net/common/destiny2_content/icons/7cd52fc7131a02c6b03544df779cb8c6.png

      raid_lair_modifiers = {
        loadouts: {
          primary: 'Hand Cannon',
          energy: 'Sniper Rifle',
          power: 'Anything'
        },
        modifier: {
          name: 'Prism',
          description: 'Attacks matching the periodically rotating focused element do more damage. Other elemental damage is reduced. Incoming damage is unaffected.',
          icon: 'https://bungie.net/common/destiny2_content/icons/7cd52fc7131a02c6b03544df779cb8c6.png'
        },
        expiry: moment('2019-01-23 01:00:00', 'YYYY-MM-DD H:mm:ss')
      };

      if( raid_lair_modifiers.expiry.diff() > 0 ) {
        $('.right-col').prepend( getRaidLairModifiers(raid_lair_modifiers) );
      }

      if( tess_wares.length > 0 ) {
        $('.right-col').append( getVendorStr(tess_wares, 'Tess\'s Precious') );
      }

      $('[data-toggle="tooltip"]').tooltip({
        html: true
      });
    }
  });

  $.get('/api/nightfall', function(data){

    data = JSON.parse(data);
    $('.home-vendor-container .row').removeClass('spinner');

    if( data.length > 0 ) {
      $('.left-col').prepend( getVendorStr(data, 'Nightfalls') );

      $('[data-toggle="tooltip"]').tooltip({
        html: true
      });
    }
  });

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

  function getVendorStr(data, title, type="vertical") {
    str = `
    <div class="mb-3 border-warning border">
      <div class="border-warning border-bottom p-2">`+title+`</div>
      <div class="pl-2 pr-2 pt-2 pb-1 `+(type=='vertical'?'':'d-md-flex flex-md-wrap justify-content-md-around')+`">
    `;

    for(var i=0; i<data.length; i++) {

      var tooltip = '';
      var cost = '';

      if( data[i].description ) {

        if( data[i].cost ) {
          cost = `<div class='mt-2'>Price: `+data[i].cost+` `+data[i].cost_name+`</div>`;
        }

        tooltip = `
        <div>
          <h6 class='font-weight-bold mb-1'>`+data[i].name+`</h6>
          <div class='d-flex align-items-start'>
            <div>
              <img src='https://bungie.net`+data[i].icon+`' class='mt-1 mb-1 mr-2' style='width: 50px; height: 50px;'/>
            </div>
            <div>`+data[i].description.replace(/"/g, "'")+`</div>
          </div>
          `+cost+`
        </div>
        `;
      }

      str += `
      <div class="d-flex mb-1 vendor-item" data-toggle="tooltip" title="`+tooltip+`">
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

  function getRaidLairModifiers(data) {

    var tooltip = `
    <h6 class='font-weight-bold mb-1'>`+data.modifier.name+`</h6>
    <div>`+data.modifier.description+`</div>
    `;

    var str = `
    <div class="mb-3 border-warning border">
      <div class="border-warning border-bottom p-2">Y1 Prestige Raid Lair Modifiers***</div>
      <div class="pl-2 pr-2 pt-2 pb-1">
        <div class="mb-1 vendor-item">
          <div><u>Loadout</u></div>
          <div class="d-flex">
            <img class="img-fluid" src="https://bungie.net/common/destiny2_content/icons/dc4bb9bcdd4ae8a83fb9007a51d7d711.png" style="width: 20px; height: 20px; margin-right: 5px;"/> Primary: `+data.loadouts.primary+`
          </div>
          <div class="d-flex">
            <img class="img-fluid" src="https://bungie.net/common/destiny2_content/icons/b6d3805ca8400272b7ee7935b0b75c79.png" style="width: 20px; height: 20px; margin-right: 5px;"/> Energy: `+data.loadouts.energy+`
          </div>
          <div class="d-flex">
            <img class="img-fluid" src="https://bungie.net/common/destiny2_content/icons/9fa60d5a99c9ff9cea0fb6dd690f26ec.png" style="width: 20px; height: 20px; margin-right: 5px;"/> Power: `+data.loadouts.power+`
          </div>
          <div class="mt-2"><u>Modifier</u></div>
          <div class="d-flex mt-1" data-toggle="tooltip" title="`+tooltip+`">
            <img class="img-fluid" src="`+data.modifier.icon+`" style="width: 20px; height: 20px; margin-right: 5px;"/>
            `+data.modifier.name+`
          </div>
        </div>
      </div>
    </div>
    `
    return str;
  }

  function getEscalationProtocol() {

    var escalationProtocol = {
      'Kathok, Roar of Xol': {
        name: 'IKELOS_SMG_v1.0.1',
        icon: '/common/destiny2_content/icons/85ad82abdfc13537325b45a85d6f4462.jpg'
      },
      'Damkath, The Mask': {
        name: 'IKELOS_SR_v1.0.1',
        icon: '/common/destiny2_content/icons/52630df015ef0e839555982c478d78f3.jpg'
      },
      'Naksud, the Famine': {
        name: 'All 3 Weapons',
        icon: '/common/destiny2_content/icons/d316fa414f16795f5f0674a35d2bdae7.jpg'
      },
      'Bok Litur, Hunger of Xol': {
        name: 'All 3 Weapons',
        icon: '/common/destiny2_content/icons/d316fa414f16795f5f0674a35d2bdae7.jpg'
      },
      'Nur Abath, Crest of Xol': {
        name: 'IKELOS_SG_v1.0.1',
        icon: '/common/destiny2_content/icons/edfdd807c9d604e80b48ad8fe39c8f36.jpg'
      },
    };

    var startACDate = moment('2019-01-16 01:00:00', 'YYYY-MM-DD H:mm:ss');
    var currDate = moment();

    var index = 0;
    var found = false;

    while(found == false) {

      if( index == Object.keys(escalationProtocol).length ) {
        index = 0;
      }

      nextWeek = moment( startACDate.format('YYYY-MM-DD H:mm:ss'), 'YYYY-MM-DD H:mm:ss' ).add(7, 'days');

      if( currDate.isBetween(startACDate, nextWeek) ) {
        found = true;
      }
      else {
        startACDate = nextWeek;
        index++;
      }
    }

    return [{
      name: escalationProtocol[ Object.keys(escalationProtocol)[index] ].name,
      icon: escalationProtocol[ Object.keys(escalationProtocol)[index] ].icon,
      description: 'Boss: ' + Object.keys(escalationProtocol)[index]
    }];
  }

  function getAscendantChallenge() {

    var ascendantChallenges = {
      'Gardens of Esila': "At the overlook's edge, the garden grows onward.",
      'Chamber of Starlight': "Starlight, star bright, first untruth she'll craft tonight...",
      'Spine of Keres': "Climb the bones and you'll find your ruin.",
      'Harbinger’s Seclude': "Crush the first queen's crown beneath your bootheel.",
      'Bay of Drowned Wishes': "Drown in your wishes, dear squanderer.",
      'Aphelion’s Rest': "They call it a 'rest,' but it is more truly a haunt."
    };

    var startACDate = moment('2019-01-16 01:00:00', 'YYYY-MM-DD H:mm:ss');
    var currDate = moment();
    // var currDate = moment('2019-05-01 05:55:55', 'YYYY-MM-DD H:mm:ss');

    var index = 0;
    var found = false;

    while(found == false) {

      if( index == Object.keys(ascendantChallenges).length ) {
        index = 0;
      }

      nextWeek = moment( startACDate.format('YYYY-MM-DD H:mm:ss'), 'YYYY-MM-DD H:mm:ss' ).add(7, 'days');

      if( currDate.isBetween(startACDate, nextWeek) ) {
        found = true;
      }
      else {
        startACDate = nextWeek;
        index++;
      }
    }

    return [{
      name: 'Ascendant: ' + Object.keys(ascendantChallenges)[index],
      icon: '/common/destiny2_content/icons/2f9e7dd03c415eb158c16bb59cc24c84.jpg',
      description: ascendantChallenges[ Object.keys(ascendantChallenges)[index] ]
    }];
  }

  function getWeeklyDCMission() {

    var weeklyDCMission = {
      'Broken Courier': "Respond to a distress call in the Strand.",
      'Oracle Engine': "The Taken threaten to take control of an irreplaceable Awoken communications device.",
      'Dark Monastery ': "Provide recon for Petra's forces by investigating strange enemy activity in Rheasilvia.",
    };

    var startDate = moment('2019-01-16 01:00:00', 'YYYY-MM-DD H:mm:ss');
    var currDate = moment();
    // var currDate = moment('2019-05-01 05:55:55', 'YYYY-MM-DD H:mm:ss');

    var index = 0;
    var found = false;

    while(found == false) {

      if( index == Object.keys(weeklyDCMission).length ) {
        index = 0;
      }

      nextWeek = moment( startDate.format('YYYY-MM-DD H:mm:ss'), 'YYYY-MM-DD H:mm:ss' ).add(7, 'days');

      if( currDate.isBetween(startDate, nextWeek) ) {
        found = true;
      }
      else {
        startDate = nextWeek;
        index++;
      }
    }

    return [{
      name: 'Mission: ' + Object.keys(weeklyDCMission)[index],
      icon: '/common/destiny2_content/icons/a6ce21a766375f5bcfb6cc01b093a383.png',
      description: weeklyDCMission[ Object.keys(weeklyDCMission)[index] ]
    }];
  }

  function getCurseLevel() {

    var curseLevels = [
      'Low',
      'Medium',
      'High'
    ];

    var startDate = moment('2019-01-16 01:00:00', 'YYYY-MM-DD H:mm:ss');
    var currDate = moment();
    // var currDate = moment('2019-05-01 05:55:55', 'YYYY-MM-DD H:mm:ss');

    var index = 0;
    var found = false;

    while(found == false) {

      if( index == Object.keys(curseLevels).length ) {
        index = 0;
      }

      nextWeek = moment( startDate.format('YYYY-MM-DD H:mm:ss'), 'YYYY-MM-DD H:mm:ss' ).add(7, 'days');

      if( currDate.isBetween(startDate, nextWeek) ) {
        found = true;
      }
      else {
        startDate = nextWeek;
        index++;
      }
    }

    var description = 'The curse level is ' + curseLevels[index].toLowerCase() + ' in the Dreaming City this week.';

    if( index == 2 )
      description += ' Shattered Throne is up.';

    return [{
      name: 'Curse Level: ' + curseLevels[index],
      icon: '/common/destiny2_content/icons/8f755eb3a9109ed7adfc4a8b27871e7a.png',
      description: description
    }];
  }
});
$(document).ready(function(){
  $.get('/api/characters', function(charData){

    charData = JSON.parse(charData);

    /********************************
       Playtime by class
    *********************************/

    $('#classPlaytime').removeClass('spinner');

    var classPlaytimes = {
      Warlock: charData.filter(function(char){ return char.class == 'Warlock'; }).map(user => Math.floor(user.minutesPlayedTotal / 60)).reduce((prev, next) => prev + next),
      Hunter: charData.filter(function(char){ return char.class == 'Hunter'; }).map(user => Math.floor(user.minutesPlayedTotal / 60)).reduce((prev, next) => prev + next),
      Titan: charData.filter(function(char){ return char.class == 'Titan'; }).map(user => Math.floor(user.minutesPlayedTotal / 60)).reduce((prev, next) => prev + next),
    };

    var classPlaytimeCanvas = document.getElementById('classPlaytime').getContext('2d');
    var classPlaytimePieChart = new Chart(classPlaytimeCanvas,{
        type: 'horizontalBar',
        data: {
          datasets: [{
              data: Object.values(classPlaytimes),
              backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
              borderColor: ['#ff6384', '#36a2eb', '#ffce56']
          }],
          labels: [
              'Warlock',
              'Hunter',
              'Titan'
          ]
        },
        options: {
          title: {
            display: true,
            text: 'Time Played by Class (hours)',
          },
          legend: {
            display: false
          },
          tooltips: tooltip( Object.values(classPlaytimes).reduce((prev, next) => prev + next) ),
          scales: {
            xAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          }
        },
    });
  });

  /********************************
      Weapon Kills
  *********************************/

  $.get('/api/stats/weapons', function(weaponData){

    weaponData = JSON.parse(weaponData);

    $('#weapons').removeClass('spinner');

    var keyMap = {
      'weaponKillsAutoRifle': 'Auto Rifle',
      'weaponKillsBow': 'Bow',
      'weaponKillsFusionRifle': 'Fusion Rifle',
      'weaponKillsGrenadeLauncher': 'Grenade Launcher',
      'weaponKillsHandCannon': 'Hand Cannon',
      'weaponKillsPulseRifle': 'Pulse Rifle',
      'weaponKillsRocketLauncher': 'Rocket Launcher',
      'weaponKillsScoutRifle': 'Scout Rifle',
      'weaponKillsShotgun': 'Shotgun',
      'weaponKillsSideArm': 'Sidearm',
      'weaponKillsSubmachinegun': 'SMG',
      'weaponKillsSniper': 'Sniper Rifle',
      'weaponKillsSword': 'Sword',
      'weaponKillsTraceRifle': 'Trace Rifle',
    };

    var weaponKills = {};
    var colors = [];
    Object.keys(keyMap).forEach(function(key){
      weaponKills[key] = weaponData.map(user => Math.floor(user[key] / 1000) ).reduce((prev, next) => prev + next)
      colors.push( randomColor() );
    });

    var weaponsCanvas = document.getElementById('weapons').getContext('2d');
    var weaponsPieChart = new Chart(weaponsCanvas,{
        type: 'horizontalBar',
        data: {
          datasets: [{
              data: Object.values(weaponKills),
              backgroundColor: colors,
              borderColor: colors,
          }],
          labels: Object.values(keyMap)
        },
        options: {
          title: {
            display: true,
            text: 'Weapon Kills (thousands)',
          },
          legend: {
            display: false
          },
          tooltips: tooltip( Object.values(weaponKills).reduce((prev, next) => prev + next) ),
        }
    });
  });

  /********************************
      Raid Completions
  *********************************/

  $.get('/api/stats/raid', function(raidData){

    raidData = JSON.parse(raidData);

    $('#raids').removeClass('spinner');

    var raidMap = {
      levi: 'Leviathan',
      levip: 'Prestige Leviathan',
      eow: 'Eater of Worlds',
      eowp: 'Prestige Eater of Worlds',
      sos: 'Spire of Stars',
      sosp: 'Prestige Spire of Stars',
      lw: 'Last Wish',
      sotp: 'Scourge of the Past',
    };

    var raidCompletions = {};
    var colors = [];
    Object.keys(raidMap).forEach(function(key){
      raidCompletions[key] = raidData.map(user => user[key]).reduce((prev, next) => prev + next)
      colors.push( randomColor() );
    });

    var raidCanvas = document.getElementById('raids').getContext('2d');
    var raidPieChart = new Chart(raidCanvas,{
        type: 'horizontalBar',
        data: {
          datasets: [{
              label: "Completions",
              data: Object.values(raidCompletions),
              backgroundColor: colors,
              borderColor: colors,
          }],
          labels: Object.values(raidMap)
        },
        options: {
          title: {
            display: true,
            text: 'Raid Completions',
          },
          legend: {
            display: false,
            position: 'right'
          },
          tooltips: tooltip( Object.values(raidCompletions).reduce((prev, next) => prev + next) ),
        }
    });
  });

  /********************************
      Last Online
  *********************************/
  $.get('/api/members', function(memberData){

    memberData = JSON.parse(memberData);

    $('#lastOnline').removeClass('spinner');

    var lastLogin = {
      'Last Week': memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') <= 7 }).length,
      '2 Weeks Ago': memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') > 7 && moment().diff( moment(member.last_online) , 'days') <= 14 }).length,
      '3 Weeks Ago': memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') > 14 && moment().diff( moment(member.last_online) , 'days') <= 21 }).length,
      '4 Weeks Ago': memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') > 21 && moment().diff( moment(member.last_online) , 'days') <= 28 }).length,
      '> 4 Weeks Ago': memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') > 28 }).length,
    };

    console.log( memberData.filter(function(member){ return moment().diff( moment(member.last_online) , 'days') > 21 }) );

    var colors = [];
    for(var i=0; i<Object.keys(lastLogin).length; i++) {
      colors.push( randomColor() );
    }

    var lastOnlineCanvas = document.getElementById('lastOnline').getContext('2d');
    var lastOnlinePieChart = new Chart(lastOnlineCanvas,{
        type: 'horizontalBar',
        data: {
          datasets: [{
              data: Object.values(lastLogin),
              backgroundColor: colors,
              borderColor: colors,
          }],
          labels:[
            'Last Week',
            '2 Weeks Ago',
            '3 Weeks Ago',
            '4 Weeks Ago',
            '> 1 Month Ago',
          ]
        },
        options: {
          title: {
            display: true,
            text: "Last Activity of "+memberData.length+" Clan Members",
          },
          legend: {
            display: false
          },
          tooltips: tooltip( Object.values(lastLogin).reduce((prev, next) => prev + next) ),
        }
    });

    console.log( lastLogin );
  });
});

function tooltip(maxValue) {
  return {
    callbacks: {
        label: function(tooltipItem, data) {
            return data['datasets'][0]['data'][tooltipItem['index']].toLocaleString() + ' (' + parseFloat(data['datasets'][0]['data'][tooltipItem['index']] / maxValue * 100).toFixed(2) + '%)';
        }
    }
  }
}

function randomColor(){

  function randomIntFromInterval(min,max) // min and max included
  {
    return Math.floor(Math.random()*(max-min+1)+min);
  }

  brightness = randomIntFromInterval(1, 100);

  function randomChannel(brightness){
    var r = 255-brightness;
    var n = 0|((Math.random() * r) + brightness);
    var s = n.toString(16);
    return (s.length==1) ? '0'+s : s;
  }
  return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}

function dynamicColors() {
  var r = Math.floor(Math.random() * 255);
  var g = Math.floor(Math.random() * 255);
  var b = Math.floor(Math.random() * 255);
  return "rgb(" + r + "," + g + "," + b + ")";
};
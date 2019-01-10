$(document).ready(function(){

  $("#badges-container, #raid-container, #pve-container, #pvp-container, #weapon-container, #gambit-container, #triump-container")
  .addClass("spinner");

  $.get("api/stats/all", function(data){

    $("#badges-container, #raid-container, #pve-container, #pvp-container, #weapon-container, #gambit-container, #triump-container")
    .removeClass("spinner");

    // Badges
    $("#badges-container").html( badges(data) );

    // Raid Stats
    $("#raid-container").html( raidDataTable(data) );
    $("#raid_table").addClass("bg-white text-dark");
    let raid_table = $("#raid_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 13, 'desc' ]]
    });

    raid_table.on( 'order.dt search.dt', function () {
        raid_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();

    // PvE Stats
    $("#pve-container").html( pveDataTable(data) );
    $("#pve_table").addClass("bg-white text-dark");
    let pve_table = $("#pve_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 1, 'asc' ]]
    });

    pve_table.on( 'order.dt search.dt', function () {
        pve_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();

    // PvP Stats
    $("#pvp-container").html( pvpDataTable(data) );
    $("#pvp_table").addClass("bg-white text-dark");
    let pvp_table = $("#pvp_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 7, 'desc' ]]
    });

    pvp_table.on( 'order.dt search.dt', function () {
        pvp_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();

    // Weapon Stats
    $("#weapon-container").html( weaponDataTable(data) );
    $("#weapon_table").addClass("bg-white text-dark");
    let weapon_table = $("#weapon_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 1, 'asc' ]]
    });

    weapon_table.on( 'order.dt search.dt', function () {
        weapon_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();

    // Triumph
    $("#triumph-container").html( triumphDataTable(data) );
    $("#triumph_table").addClass("bg-white text-dark");
    let triumph_table = $("#triumph_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 3, 'desc' ]]
    });

    triumph_table.on( 'order.dt search.dt', function () {
        triumph_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();

    // Gambit
    $("#gambit-container").html( gambitDataTable(data) );
    $("#gambit_table").addClass("bg-white text-dark");
    let gambit_table = $("#gambit_table").DataTable({
      paging: true,
      pageLength: 50,
      fixedHeader: false,
      "columnDefs": [ {
          "searchable": false,
          "orderable": false,
          "targets": 0
      } ],
      "order": [[ 1, 'asc' ]]
    });

    gambit_table.on( 'order.dt search.dt', function () {
        gambit_table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    } ).draw();
  });

});

function triumphDataTable(rows) {

  if( rows.triumph.length <= 0 )
    return '';
  else
    rows = rows.triumph;

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="triumph_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-left">Clan</th>
          <th class="text-right">Triumph</th>
        </tr>
    </thead>
    <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {
    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].username+bnetId+`</td>
      <td class="text-left">`+rows[i].clan_no+`</td>
      <td class="text-right">`+rows[i].triumph.toLocaleString()+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function badges(data) {

  if( data.pve.length <= 0 && data.pvp.length <= 0 && data.weapon.length <= 0 && data.gambit.length <= 0 ) {
    return '';
  }

  if( data.pve.length > 0 ) {
    highest_raid_count = data.pve.reduce(function(prev, current){
      return current.raid_count > prev.raid_count ? current : prev;
    });

    highest_pe_count = data.pve.reduce(function(prev, current){
      return current.publicEventsCompleted > prev.publicEventsCompleted ? current : prev;
    });

    highest_activities_count = data.pve.reduce(function(prev, current){
      return current.activitiesCleared > prev.activitiesCleared ? current : prev;
    });

    highest_super_count = data.pve.reduce(function(prev, current){
      return current.weaponKillsSuper > prev.weaponKillsSuper ? current : prev;
    });

    highest_melee_count = data.pve.reduce(function(prev, current){
      return current.weaponKillsMelee > prev.weaponKillsMelee ? current : prev;
    });

    highest_grenade_count = data.pve.reduce(function(prev, current){
      return current.weaponKillsGrenade > prev.weaponKillsGrenade ? current : prev;
    });

    highest_kill_count = data.pve.reduce(function(prev, current){
      return current.kills > prev.kills ? current : prev;
    });

    highest_death_count = data.pve.reduce(function(prev, current){
      return current.deaths > prev.deaths ? current : prev;
    });

    highest_suicide_count = data.pve.reduce(function(prev, current){
      return current.suicides > prev.suicides ? current : prev;
    });

    highest_kd_count = data.pve.reduce(function(prev, current){
      return current.kd > prev.kd ? current : prev;
    });
  }

  if( data.pvp.length > 0 ) {
    highest_glory_count = data.pvp.reduce(function(prev, current){
      return current.glory > prev.glory ? current : prev;
    });

    highest_pvp_kd_count = data.pvp.reduce(function(prev, current){
      return current.kd > prev.kd ? current : prev;
    });

    highest_pvp_kda_count = data.pvp.reduce(function(prev, current){
      return current.kda > prev.kda ? current : prev;
    });

    highest_pvp_kad_count = data.pvp.reduce(function(prev, current){
      return current.kad > prev.kad ? current : prev;
    });

    highest_gold_medals_count = data.pvp.reduce(function(prev, current){
      return current.gold_medals > prev.gold_medals ? current : prev;
    });

    highest_valor_resets_count = data.pvp.reduce(function(prev, current){
      return current.valor_resets > prev.valor_resets ? current : prev;
    });

    highest_triumph_count = data.pvp.reduce(function(prev, current){
      return current.triumph > prev.triumph ? current : prev;
    });
  }

  if( data.gambit.length > 0 ) {
    highest_infamy_resets_count = data.gambit.reduce(function(prev, current){
      return current.infamy_resets > prev.infamy_resets ? current : prev;
    });

    highest_invasion_kills_count = data.gambit.reduce(function(prev, current){
      return current.invasionKills > prev.invasionKills ? current : prev;
    });

    highest_motes_deposited_count = data.gambit.reduce(function(prev, current){
      return current.motesDeposited > prev.motesDeposited ? current : prev;
    });
  }

  if( data.weapon.length > 0 ) {
    /* Weapons */
    highest_auto_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsAutoRifle > prev.weaponKillsAutoRifle ? current : prev;
    });

    highest_bow = data.weapon.reduce(function(prev, current){
      return current.weaponKillsBow > prev.weaponKillsBow ? current : prev;
    });

    highest_fusion_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsFusionRifle > prev.weaponKillsFusionRifle ? current : prev;
    });

    highest_hand_cannon = data.weapon.reduce(function(prev, current){
      return current.weaponKillsHandCannon > prev.weaponKillsHandCannon ? current : prev;
    });

    highest_trace_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsTraceRifle > prev.weaponKillsTraceRifle ? current : prev;
    });

    highest_pulse_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsPulseRifle > prev.weaponKillsPulseRifle ? current : prev;
    });

    highest_rocket_launcher = data.weapon.reduce(function(prev, current){
      return current.weaponKillsRocketLauncher > prev.weaponKillsRocketLauncher ? current : prev;
    });

    highest_scout_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsScoutRifle > prev.weaponKillsScoutRifle ? current : prev;
    });

    highest_shotgun = data.weapon.reduce(function(prev, current){
      return current.weaponKillsShotgun > prev.weaponKillsShotgun ? current : prev;
    });

    highest_sniper_rifle = data.weapon.reduce(function(prev, current){
      return current.weaponKillsSniper > prev.weaponKillsSniper ? current : prev;
    });

    highest_smg = data.weapon.reduce(function(prev, current){
      return current.weaponKillsSubmachinegun > prev.weaponKillsSubmachinegun ? current : prev;
    });

    highest_sidearm = data.weapon.reduce(function(prev, current){
      return current.weaponKillsSideArm > prev.weaponKillsSideArm ? current : prev;
    });

    highest_sword = data.weapon.reduce(function(prev, current){
      return current.weaponKillsSword > prev.weaponKillsSword ? current : prev;
    });

    highest_grenade_launcher = data.weapon.reduce(function(prev, current){
      return current.weaponKillsGrenadeLauncher > prev.weaponKillsGrenadeLauncher ? current : prev;
    });
  }

  let badgeData = {
    pve: {},
    pvp: {},
    weapon: {},
    gambit: {}
  }

  if( data.pve.length > 0 ) {
    badgeData.pve = {
      'highest_raid_count' : {
        badgeName: 'Tomb Raider',
        userId: highest_raid_count.bnet_id,
        title: 'Raids Cleared:',
        count: highest_raid_count.raid_count.toLocaleString(),
        color: 'gold',
        icon: 'fas fa-dungeon'
      },
      'highest_pe_count' : {
        badgeName: 'The Socialite',
        userId: highest_pe_count.bnet_id,
        title: 'Public Events Completed:',
        count: highest_pe_count.publicEventsCompleted.toLocaleString(),
        color: 'blue',
        icon: 'fas fa-flag'
      },
      'highest_activities_count' : {
        badgeName: 'Steady Pom Pipi',
        userId: highest_activities_count.bnet_id,
        title: 'Activities Cleared:',
        count: highest_activities_count.activitiesCleared.toLocaleString(),
        color: 'teal',
        icon: 'fas fa-infinity'
      },
      'highest_super_count' : {
        badgeName: 'Superman',
        userId: highest_super_count.bnet_id,
        title: 'Super Kills:',
        count: highest_super_count.weaponKillsSuper.toLocaleString(),
        color: 'red',
        icon: 'fas fa-atom'
      },
      'highest_melee_count' : {
        badgeName: 'Saitama',
        userId: highest_melee_count.bnet_id,
        title: 'Melee Kills:',
        count: highest_melee_count.weaponKillsMelee.toLocaleString(),
        color: 'yellow',
        icon: 'fas fa-fist-raised'
      },
      'highest_grenade_count' : {
        badgeName: 'Chi Ba Boom',
        userId: highest_grenade_count.bnet_id,
        title: 'Grenade Kills:',
        count: highest_grenade_count.weaponKillsGrenade.toLocaleString(),
        color: 'green',
        icon: 'fas fa-bomb'
      },
      'highest_kill_count' : {
        badgeName: 'Killmonger',
        userId: highest_kill_count.bnet_id,
        title: 'Kills:',
        count: highest_kill_count.kills.toLocaleString(),
        color: 'purple',
        icon: 'fas fa-khanda'
      },
      'highest_death_count' : {
        badgeName: 'Death Incarnate',
        userId: highest_death_count.bnet_id,
        title: 'Deaths:',
        count: highest_death_count.deaths.toLocaleString(),
        color: 'orange',
        icon: 'fas fa-ghost'
      },
      'highest_suicide_count' : {
        badgeName: 'Aloha snack bar',
        userId: highest_suicide_count.bnet_id,
        title: 'Suicides:',
        count: highest_suicide_count.suicides.toLocaleString(),
        color: 'pink',
        icon: 'fas fa-skull'
      },
      'highest_kd_count' : {
        badgeName: 'KD Maestro',
        userId: highest_kd_count.bnet_id,
        title: 'PvE Kill-Death Ratio:',
        count: highest_kd_count.killsDeathsRatio.toLocaleString(),
        color: 'blue-dark',
        icon: 'fas fa-balance-scale'
      },
    }
  }

  if( data.gambit.length > 0 ) {
    badgeData.gambit = {
      'highest_infamy_resets_count' : {
        badgeName: 'Poker Face',
        userId: highest_infamy_resets_count.bnet_id,
        title: 'Infamy Resets:',
        count: highest_infamy_resets_count.infamy_resets.toLocaleString(),
        color: 'teal',
        icon: 'ra ra-spades-card'
      },
      'highest_motes_deposited_count' : {
        badgeName: 'Hoarder',
        userId: highest_motes_deposited_count.bnet_id,
        title: 'Motes Deposited:',
        count: highest_motes_deposited_count.motesDeposited.toLocaleString(),
        color: 'orange',
        icon: 'fas fa-dice-d20'
      },
      'highest_invasion_kills_count' : {
        badgeName: 'Clingy',
        userId: highest_invasion_kills_count.bnet_id,
        title: 'Invasion Kills:',
        count: highest_invasion_kills_count.invasionKills.toLocaleString(),
        color: 'purple',
        icon: 'ra ra-player-shot'
      },
    }
  }

  if( data.pvp.length > 0 ) {

    badgeData.pvp = {
      'highest_glory_count' : {
        badgeName: 'Serial Killer',
        userId: highest_glory_count.bnet_id,
        title: 'PvP Competitive Glory:',
        count: highest_glory_count.glory.toLocaleString(),
        color: 'green-dark',
        icon: 'fab fa-wolf-pack-battalion'
      },
      'highest_gold_medals_count' : {
        badgeName: '24K Magic',
        userId: highest_gold_medals_count.bnet_id,
        title: 'Gold Medals:',
        count: highest_gold_medals_count.gold_medals.toLocaleString(),
        color: 'gold',
        icon: 'fas fa-medal'
      },
      'highest_pvp_kd_count' : {
        badgeName: 'Death Dealer',
        userId: highest_pvp_kd_count.bnet_id,
        title: 'PvP Kill-Death Ratio:',
        count: highest_pvp_kd_count.kd.toLocaleString(),
        color: 'silver',
        icon: 'ra ra-skull-trophy'
      },
      'highest_valor_resets_count' : {
        badgeName: 'Crucifier',
        userId: highest_valor_resets_count.bnet_id,
        title: 'Valor Resets:',
        count: highest_valor_resets_count.valor_resets.toLocaleString(),
        color: 'red',
        icon: 'ra ra-nails'
      },
      'highest_triumph_count' : {
        badgeName: 'OCD',
        userId: highest_triumph_count.bnet_id,
        title: 'Triumph Points:',
        count: highest_triumph_count.triumph.toLocaleString(),
        color: 'yellow',
        icon: 'fas fa-exclamation'
      },
    }
  }

  if( data.weapon.length > 0 ) {
    badgeData.weapon = {
      'highest_auto_rifle_count' : {
        badgeName: 'Rambo',
        userId: highest_auto_rifle.bnet_id,
        title: 'Auto Rifle Kills:',
        count: highest_auto_rifle.weaponKillsAutoRifle.toLocaleString(),
        color: 'gold',
        icon: 'ra ra-rifle'
      },
      'highest_bow' : {
        badgeName: 'Legolas',
        userId: highest_bow.bnet_id,
        title: 'Bow Kills:',
        count: highest_bow.weaponKillsBow.toLocaleString(),
        color: 'blue',
        icon: 'ra ra-supersonic-arrow'
      },
      'highest_fusion_rifle' : {
        badgeName: 'Gogeta',
        userId: highest_fusion_rifle.bnet_id,
        title: 'Fusion Rifle Kills:',
        count: highest_fusion_rifle.weaponKillsFusionRifle.toLocaleString(),
        color: 'teal',
        icon: 'ra ra-laser-blast'
      },
      'highest_hand_cannon' : {
        badgeName: 'High Noon',
        userId: highest_hand_cannon.bnet_id,
        title: 'Hand Cannon Kills:',
        count: highest_hand_cannon.weaponKillsHandCannon.toLocaleString(),
        color: 'red',
        icon: 'ra ra-revolver'
      },
      'highest_trace_rifle' : {
        badgeName: 'Cat Trap',
        userId: highest_trace_rifle.bnet_id,
        title: 'Trace Rifle Kills:',
        count: highest_trace_rifle.weaponKillsTraceRifle.toLocaleString(),
        color: 'yellow',
        icon: 'ra ra-target-laser'
      },
      'highest_pulse_rifle' : {
        badgeName: 'headseeker',
        userId: highest_pulse_rifle.bnet_id,
        title: 'Pulse Rifle Kills:',
        count: highest_pulse_rifle.weaponKillsPulseRifle.toLocaleString(),
        color: 'green',
        icon: 'ra ra-mp5'
      },
      'highest_rocket_launcher' : {
        badgeName: 'Riven\'s Bane',
        userId: highest_rocket_launcher.bnet_id,
        title: 'Rocket Launcher Kills:',
        count: highest_rocket_launcher.weaponKillsRocketLauncher.toLocaleString(),
        color: 'purple',
        icon: 'ra ra-cluster-bomb'
      },
      'highest_scout_rifle' : {
        badgeName: 'Recee',
        userId: highest_scout_rifle.bnet_id,
        title: 'Scout Rifle Kills:',
        count: highest_scout_rifle.weaponKillsScoutRifle.toLocaleString(),
        color: 'orange',
        icon: 'ra ra-targeted'
      },
      'highest_shotgun' : {
        badgeName: 'Eat This!',
        userId: highest_shotgun.bnet_id,
        title: 'Shotgun Kills:',
        count: highest_shotgun.weaponKillsShotgun.toLocaleString(),
        color: 'pink',
        icon: 'ra ra-musket'
      },
      'highest_sniper_rifle' : {
        badgeName: 'Hitman',
        userId: highest_sniper_rifle.bnet_id,
        title: 'Sniper Rifle Kills:',
        count: highest_sniper_rifle.weaponKillsSniper.toLocaleString(),
        color: 'blue-dark',
        icon: 'ra ra-targeted'
      },
      'highest_smg' : {
        badgeName: 'watatatatata',
        userId: highest_smg.bnet_id,
        title: 'SMG Kills:',
        count: highest_smg.weaponKillsSubmachinegun.toLocaleString(),
        color: 'green-dark',
        icon: 'ra ra-mp5'
      },
      'highest_sidearm' : {
        badgeName: 'pewpewpew',
        userId: highest_sidearm.bnet_id,
        title: 'Sidearm Kills:',
        count: highest_sidearm.weaponKillsSideArm.toLocaleString(),
        color: 'silver',
        icon: 'ra ra-crossed-pistols'
      },
      'highest_sword' : {
        badgeName: 'Samurai X',
        userId: highest_sword.bnet_id,
        title: 'Sword Kills:',
        count: highest_sword.weaponKillsSword.toLocaleString(),
        color: 'gold',
        icon: 'ra ra-sword'
      },
      'highest_grenade_launcher' : {
        badgeName: 'Grenadier',
        userId: highest_grenade_launcher.bnet_id,
        title: 'Grenade Launcher Kills:',
        count: highest_grenade_launcher.weaponKillsGrenadeLauncher.toLocaleString(),
        color: 'blue',
        icon: 'ra ra-grenade'
      }
    }
  }

  let str = `
  <div class="badge-container">
    <div class="row">
  `;

  for( key in badgeData.pve ) {
    str += `
      <div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
        <div class="main-wrapper">
          <div class="badge `+badgeData.pve[key].color+`">
            <div class="circle"> <i class="`+badgeData.pve[key].icon+`"></i></div>
            <div class="ribbon">`+badgeData.pve[key].badgeName+`</div>
          </div>
          <div class="badge-description">
            <div class="player">
              <strong>`+badgeData.pve[key].userId+`</strong>
            </div>
            <div class="stat">
              `+badgeData.pve[key].title+`<br/>`+badgeData.pve[key].count+`
            </div>
          </div>
        </div>
      </div>
    `;
  }

  for( key in badgeData.pvp ) {
    str += `
      <div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
        <div class="main-wrapper">
          <div class="badge `+badgeData.pvp[key].color+`">
            <div class="circle"> <i class="`+badgeData.pvp[key].icon+`"></i></div>
            <div class="ribbon">`+badgeData.pvp[key].badgeName+`</div>
          </div>
          <div class="badge-description">
            <div class="player">
              <strong>`+badgeData.pvp[key].userId+`</strong>
            </div>
            <div class="stat">
              `+badgeData.pvp[key].title+`<br/>`+badgeData.pvp[key].count+`
            </div>
          </div>
        </div>
      </div>
    `;
  }

  for( key in badgeData.gambit ) {
    str += `
      <div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
        <div class="main-wrapper">
          <div class="badge `+badgeData.gambit[key].color+`">
            <div class="circle"> <i class="`+badgeData.gambit[key].icon+`"></i></div>
            <div class="ribbon">`+badgeData.gambit[key].badgeName+`</div>
          </div>
          <div class="badge-description">
            <div class="player">
              <strong>`+badgeData.gambit[key].userId+`</strong>
            </div>
            <div class="stat">
              `+badgeData.gambit[key].title+`<br/>`+badgeData.gambit[key].count+`
            </div>
          </div>
        </div>
      </div>
    `;
  }

  str += `
    </div>
    <div>
      <h2 class="text-center mb-3 mt-5">Top Weapon Kills</h2>
    </div>
    <div class="row">`;

  for( key in badgeData.weapon ) {
    str += `
      <div class="col-lg-2 col-md-3 col-sm-6 col-xs-12">
        <div class="main-wrapper">
          <div class="badge `+badgeData.weapon[key].color+`">
            <div class="circle"> <i class="`+badgeData.weapon[key].icon+`"></i></div>
            <div class="ribbon">`+badgeData.weapon[key].badgeName+`</div>
          </div>
          <div class="badge-description">
            <div class="player">
              <strong>`+badgeData.weapon[key].userId+`</strong>
            </div>
            <div class="stat">
              `+badgeData.weapon[key].title+`<br/>`+badgeData.weapon[key].count+`
            </div>
          </div>
        </div>
      </div>
    `;
  }

  str += `
    </div>
  </div>`;

  return str;
}

function weaponDataTable(rows) {

  if( rows.weapon.length <= 0 )
    return '';
  else
    rows = rows.weapon;

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="weapon_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-left">Clan</th>
          <th class="text-right">Auto Rifle</th>
          <th class="text-right">Bow</th>
          <th class="text-right">Fusion Rifle</th>
          <th class="text-right">Hand Cannon</th>
          <th class="text-right">Trace Rifle</th>
          <th class="text-right">Pulse Rifle</th>
          <th class="text-right">Rocket Launcher</th>
          <th class="text-right">Scout Rifle</th>
          <th class="text-right">Shotgun</th>
          <th class="text-right">Sniper</th>
          <th class="text-right">SMG</th>
          <th class="text-right">Sidearm</th>
          <th class="text-right">Sword</th>
          <th class="text-right">Grenade Launcher</th>
        </tr>
    </thead>
    <tbody>`;

  for(var i=0;i<rows.length;i++) {
    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].display_name+bnetId+`</td>
      <td class="text-left">`+rows[i].clan_no+`</td>
      <td class="text-right">`+rows[i].weaponKillsAutoRifle.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsBow.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsFusionRifle.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsHandCannon.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsTraceRifle.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsPulseRifle.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsRocketLauncher.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsScoutRifle.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsShotgun.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsSniper.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsSubmachinegun.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsSideArm.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsSword.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].weaponKillsGrenadeLauncher.toLocaleString()+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function raidDataTable(rows) {

  if( rows.raid.length <= 0 )
    return '';
  else
    rows = rows.raid;

  let raids = {
    'Levi': 'levi',
    'Levi Pres.': 'levip',
    'EoW': 'eow',
    'EoW Pres.': 'eowp',
    'SoS': 'sos',
    'SoS Pres.': 'sosp',
    'LW': 'lw',
    'SoTP': 'sotp',
  };

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="raid_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-left">Clan</th>`;

  Object.keys(raids).forEach(function(raid) {
    str += `<th class="text-nowrap text-right">`+raid+`</th>`;

    if( raid == 'LW' )
      str += `<th class="text-center text-nowrap">Flawless LW</th>`;
    else if( raid == 'SoTP' )
      str += `<th class="text-center text-nowrap">Flawless SoTP</th>`;
  });

  str += `<th class="text-left">Total</th>`;
  str +=
      `</tr>
    </thead>
  <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {
    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].display_name+bnetId+`</td>
      <td class="text-left">`+rows[i].clan_no+`</td>`;

    let activityCount = 0;

    Object.keys(raids).forEach(function(raid) {
      str += `<td class="text-right">`+rows[i][raids[raid]]+`</td>`;

      if( raid == 'LW' )
        str += `<td class="text-center" data-sort="`+rows[i].petra_run+`">`+(rows[i].petra_run>0 ?'<i class="fas fa-check text-success"></i>':'<i class="fas fa-times text-danger"></i>')+`</td>`;
      else if( raid == 'SoTP' )
        str += `<td class="text-center" data-sort="`+rows[i].diamond_run+`">`+(rows[i].diamond_run>0 ?'<i class="fas fa-check text-success"></i>':'<i class="fas fa-times text-danger"></i>')+`</td>`;

      activityCount+= rows[i][raids[raid]];
    });

    str += `<td class="text-left">`+activityCount+`</td>`;
    str += `</tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function pveDataTable(rows) {

  if( rows.pve.length <= 0 )
    return '';
  else
    rows = rows.pve;

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="pve_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-left">Clan</th>
          <th class="text-right">Kills</th>
          <th class="text-right">Deaths</th>
          <th class="text-right">Suicides</th>
          <th class="text-right">KD</th>
          <th class="text-right">Super Kills</th>
          <th class="text-right">Melee Kills</th>
          <th class="text-right">Grenade Kills</th>
          <th class="text-right">Activities Cleared</th>
          <th class="text-right">Raids Cleared</th>
          <th class="text-right">Public Events Completed</th>
        </tr>
    </thead>
    <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {
    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].display_name+bnetId+`</td>
      <td class="text-left">`+rows[i].clan_no+`</td>
      <td class="text-right text-success">`+rows[i].kills.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].deaths.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].suicides.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].killsDeathsRatio+`</td>
      <td class="text-right text-success">`+rows[i].weaponKillsSuper.toLocaleString()+`</td>
      <td class="text-right text-success">`+rows[i].weaponKillsMelee.toLocaleString()+`</td>
      <td class="text-right text-success">`+rows[i].weaponKillsGrenade.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].activitiesCleared.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].raid_count+`</td>
      <td class="text-right">`+rows[i].publicEventsCompleted.toLocaleString()+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function gambitDataTable(rows) {

  if( rows.gambit.length <= 0 )
    return '';
  else
    rows = rows.gambit;

  var self = this;

  self.formatNumber = function(n) {
    const ranges = [
      { divider: 1e18 , suffix: 'E' },
      { divider: 1e15 , suffix: 'P' },
      { divider: 1e12 , suffix: 'T' },
      { divider: 1e9 , suffix: 'G' },
      { divider: 1e6 , suffix: 'M' },
      { divider: 1e3 , suffix: 'k' }
    ];

    for (var i = 0; i < ranges.length; i++) {
      if (n >= ranges[i].divider) {
        return parseFloat((n / ranges[i].divider)).toFixed(2) + ranges[i].suffix;
      }
    }
    return n.toString();
  }

  let infamyRanks = [
    'Guardian I',
    'Guardian II',
    'Guardian III',
    'Brave I',
    'Brave II',
    'Brave III',
    'Heroic I',
    'Heroic II',
    'Heroic III',
    'Fabled I',
    'Fabled II',
    'Fabled III',
    'Mythic I',
    'Mythic II',
    'Mythic III',
    'Legend',
  ];

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="gambit_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-center">Clan</th>
          <th class="text-right">Infamy</th>
          <th class="text-right">Resets</th>
          <th class="text-right">Kills</th>
          <th class="text-right">Deaths</th>
          <th class="text-right">Suicides</th>
          <th class="text-right">KD</th>
          <!--th class="text-right">Efficiency (KAD)</th-->
          <th class="text-right">Invasion Kills</th>
          <th class="text-right">Invaders Killed</th>
          <th class="text-right">Deaths via Invaders</th>
          <th class="text-right">Primeval Healing</th>
          <th class="text-right">Primeval Damage</th>
          <th class="text-right">Motes Banked</th>
          <th class="text-right">Motes Lost</th>
          <th class="text-right">Motes Denied</th>
        </tr>
    </thead>
  <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {

    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;
    infamy_rank = rows[i].infamy_step == infamyRanks.length ? infamyRanks[infamyRanks.length-1] : infamyRanks[ rows[i].infamy_step ];

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].display_name+bnetId+`</td>
      <td class="text-center">`+rows[i].clan_no+`</td>
      <td class="text-right" data-sort="`+rows[i].infamy+`">`+rows[i].infamy.toLocaleString()+`<div class="rank-`+infamy_rank.split(" ").join("").toLowerCase()+`"><small>`+infamy_rank+`</small></div></td>
      <td class="text-right">`+rows[i].infamy_resets+`</td>
      <td class="text-right text-success">`+rows[i].kills.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].deaths.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].suicides.toLocaleString()+`</td>
      <td class="text-right">`+rows[i].killsDeathsRatio.toLocaleString()+`</td>
      <!--td class="text-right">`+rows[i].efficiency.toLocaleString()+`</td-->
      <td class="text-right text-success">`+rows[i].invasionKills.toLocaleString()+`</td>
      <td class="text-right text-success">`+rows[i].invaderKills.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].invaderDeaths.toLocaleString()+`</td>
      <td class="text-right text-success" data-sort="`+rows[i].primevalHealing+`">`+parseInt(rows[i].primevalHealing).toLocaleString()+`%</td>
      <td class="text-right text-success" data-sort="`+rows[i].primevalDamage+`">`+self.formatNumber(rows[i].primevalDamage)+`</td>
      <td class="text-right text-success">`+rows[i].motesDeposited.toLocaleString()+`</td>
      <td class="text-right text-danger">`+rows[i].motesLost.toLocaleString()+`</td>
      <td class="text-right text-success">`+rows[i].motesDenied.toLocaleString()+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function pvpDataTable(rows) {

  if( rows.pvp.length <= 0 )
    return '';
  else
    rows = rows.pvp;

  let valorRanks = [
    'Guardian',
    'Brave',
    'Heroic',
    'Fabled',
    'Mythic',
    'Legend',
  ];

  let gloryRanks = [
    'Guardian I',
    'Guardian II',
    'Guardian III',
    'Brave I',
    'Brave II',
    'Brave III',
    'Heroic I',
    'Heroic II',
    'Heroic III',
    'Fabled I',
    'Fabled II',
    'Fabled III',
    'Mythic I',
    'Mythic II',
    'Mythic III',
    'Legend',
  ];

  let infamyRanks = [
    'Guardian I',
    'Guardian II',
    'Guardian III',
    'Brave I',
    'Brave II',
    'Brave III',
    'Heroic I',
    'Heroic II',
    'Heroic III',
    'Fabled I',
    'Fabled II',
    'Fabled III',
    'Mythic I',
    'Mythic II',
    'Mythic III',
    'Legend',
  ];

  /* Headers */
  str = `
  <div class="text-center">Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="pvp_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-center">Clan</th>
          <th class="text-right">KD</th>
          <th class="text-right">KDA</th>
          <th class="text-right">KAD</th>
          <th class="text-right">Gold Medals</th>
          <th class="text-right">Glory</th>
          <th class="text-right">Valor</th>
          <th class="text-right">Resets</th>
        </tr>
    </thead>
  <tbody>`;

  /* Data */
  for(var i=0; i<rows.length; i++) {

    bnetId = rows[i].bnet_id ? `<br/><small class="bnet_id">`+rows[i].bnet_id+`</small>`:``;
    glory_rank = rows[i].glory_step == gloryRanks.length ? gloryRanks[gloryRanks.length-1] : gloryRanks[ rows[i].glory_step ];
    valor_rank = rows[i].valor_step == valorRanks.length ? valorRanks[valorRanks.length-1] : valorRanks[ rows[i].valor_step ];
    infamy_rank = rows[i].infamy_step == infamyRanks.length ? infamyRanks[infamyRanks.length-1] : infamyRanks[ rows[i].infamy_step ];

    str += `
    <tr>
      <td>`+(i+1)+`</td>
      <td class="text-left">`+rows[i].display_name+bnetId+`</td>
      <td class="text-center">`+rows[i].clan_no+`</td>
      <td class="text-right">`+rows[i].kd+`</td>
      <td class="text-right">`+rows[i].kda+`</td>
      <td class="text-right">`+rows[i].kad+`</td>
      <td class="text-right">`+rows[i].gold_medals+`</td>
      <td class="text-right" data-sort="`+rows[i].glory+`">`+rows[i].glory.toLocaleString()+`<div class="rank-`+glory_rank.split(" ").join("").toLowerCase()+`"><small>`+glory_rank+`</small></div></td>
      <td class="text-right" data-sort="`+rows[i].valor+`">`+rows[i].valor.toLocaleString()+`<div class="rank-`+valor_rank.split(" ").join("").toLowerCase()+`"><small>`+valor_rank+`</small></div></td>
      <td class="text-right">`+rows[i].valor_resets+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}
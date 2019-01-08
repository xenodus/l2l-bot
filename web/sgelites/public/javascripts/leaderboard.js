function badges(data) {

  data = JSON.parse(data);

  if( !data.pve || data.pve.length <= 0 ) {
    return '';
  }

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

  badgeData = {
    pve: {
      'highest_raid_count' : {
        badgeName: 'Tomb Raider',
        userId: highest_raid_count.bnet_id,
        title: 'Raids Cleared:',
        count: highest_raid_count.raid_count.toLocaleString(),
        color: 'gold',
        icon: 'fas fa-dungeon'
      },
      'highest_pe_count' : {
        badgeName: 'P.E. Teacher',
        userId: highest_pe_count.bnet_id,
        title: 'Public Events Completed:',
        count: highest_pe_count.publicEventsCompleted.toLocaleString(),
        color: 'blue',
        icon: 'fas fa-dumbbell'
      },
      'highest_activities_count' : {
        badgeName: 'Grinder',
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
        badgeName: 'Grenadier',
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
        badgeName: 'Suicide Squad',
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
        count: highest_kd_count.kd.toLocaleString(),
        color: 'blue-dark',
        icon: 'fas fa-balance-scale'
      },
    },

    pvp: {
      'highest_glory_count' : {
        badgeName: 'Serial Killer',
        userId: highest_glory_count.bnet_id,
        title: 'PvP Competitive Glory:',
        count: highest_glory_count.glory.toLocaleString(),
        color: 'green-dark',
        icon: 'fab fa-wolf-pack-battalion'
      },
      'highest_pvp_kd_count' : {
        badgeName: 'Death Dealer',
        userId: highest_pvp_kd_count.bnet_id,
        title: 'PvP Kill-Death Ratio:',
        count: highest_pvp_kd_count.kd.toLocaleString(),
        color: 'silver',
        icon: 'fab fa-wolf-pack-battalion'
      }
    }
  };

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

  str += `
    </div>
  </div>`;

  return str;
}

function raidDataTable(rows) {

  rows = JSON.parse(rows).raid;

  if( rows.length <= 0 )
    return '';

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
  <div>Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="raid_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-center">Clan</th>
          <th class="text-left">Last Login</th>`;

  Object.keys(raids).forEach(function(raid) {
    str += `<th class="text-nowrap">`+raid+`</th>`;
  });

  str += `<th class="text-nowrap">Total</th>`;
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
      <td class="text-left">`+rows[i].username+bnetId+`</td>
      <td class="text-center">`+rows[i].clan_no+`</td>
      <td data-sort="`+moment(rows[i].last_online).unix()+`" class="text-nowrap text-left">`+moment(rows[i].last_online).format("DD MMM YYYY")+`</td>`;

    let activityCount = 0;

    Object.keys(raids).forEach(function(raid) {
      str += `<td class="text-center">`+rows[i][raids[raid]]+`</td>`;
      activityCount+= rows[i][raids[raid]];
    });

    str += `<td class="text-center">`+activityCount+`</td>`;
    str += `</tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function pveDataTable(rows) {

  rows = JSON.parse(rows).pve;

  if( rows.length <= 0 )
    return '';

  /* Headers */
  str = `
  <div>Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="pve_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-center">Clan</th>
          <th class="text-center">Kills</th>
          <th class="text-center">Deaths</th>
          <th class="text-center">Suicides</th>
          <th class="text-center">KD</th>
          <th class="text-center">Super Kills</th>
          <th class="text-center">Melee Kills</th>
          <th class="text-center">Grenade Kills</th>
          <th class="text-center">Activities Cleared</th>
          <th class="text-center">Raids Cleared</th>
          <th class="text-center">Public Events Completed</th>
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
      <td class="text-center">`+rows[i].clan_no+`</td>
      <td class="text-center">`+rows[i].kills.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].deaths.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].suicides.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].kd+`</td>
      <td class="text-center">`+rows[i].weaponKillsSuper.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].weaponKillsMelee.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].weaponKillsGrenade.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].activitiesCleared.toLocaleString()+`</td>
      <td class="text-center">`+rows[i].raid_count+`</td>
      <td class="text-center">`+rows[i].publicEventsCompleted.toLocaleString()+`</td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}

function pvpDataTable(rows) {

  rows = JSON.parse(rows).pvp;

  if( rows.length <= 0 )
    return '';

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
  <div>Last updated: `+moment(rows[0].last_updated).format("D MMM YYYY h:mm A")+`</div>
  <br/>
  <div class="table-responsive">
    <table id="pvp_table" class="display table table-striped">
      <thead>
        <tr>
          <th class="no-sort"></th>
          <th class="text-left">Name / Battle.net ID</th>
          <th class="text-nowrap text-center">Clan</th>
          <th class="text-nowrap text-right">KD</th>
          <th class="text-nowrap text-right">KDA</th>
          <th class="text-nowrap text-right">KAD</th>
          <th class="text-nowrap text-right">Glory</th>
          <th class="text-nowrap text-right">Valor</th>
          <th class="text-nowrap text-right">Infamy</th>
          <th class="text-right">Highest Game Kills</th>
          <th class="text-right">Highest Game Score</th>
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
      <td class="text-left">`+rows[i].username+bnetId+`</td>
      <td class="text-center">`+rows[i].clan_no+`</td>
      <td class="text-right">`+rows[i].kd+`</td>
      <td class="text-right">`+rows[i].kda+`</td>
      <td class="text-right">`+rows[i].kad+`</td>
      <td class="text-right" data-sort="`+rows[i].glory+`">`+rows[i].glory.toLocaleString()+`<div class="rank-`+glory_rank.split(" ").join("").toLowerCase()+`"><small>`+glory_rank+`</small></div></td>
      <td class="text-right" data-sort="`+rows[i].valor+`">`+rows[i].valor.toLocaleString()+`<div class="rank-`+valor_rank.split(" ").join("").toLowerCase()+`"><small>`+valor_rank+`</small></div></td>
      <td class="text-right" data-sort="`+rows[i].infamy+`">`+rows[i].infamy.toLocaleString()+`<div class="rank-`+infamy_rank.split(" ").join("").toLowerCase()+`"><small>`+infamy_rank+`</small></div></td>
      <td class="text-right">
        <a href="https://www.bungie.net/en/PGCR/`+rows[i].bestSingleGameKills_activityID+`" target="_blank">`+rows[i].bestSingleGameKills+`</a>
      </td>
      <td class="text-right">
        <a href="https://www.bungie.net/en/PGCR/`+rows[i].bestSingleGameScore_activityID+`" target="_blank">`+rows[i].bestSingleGameScore+`</a>
      </td>
    </tr>`;
  }

  str += `
      </tbody>
    </table>
  </div>`;

  return str;
}
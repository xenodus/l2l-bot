const config = require('../config').production;
const pool = config.getPool();
const moment = require("moment");
var Traveler = require('the-traveler').default;
let axios = require('axios');

const traveler = new Traveler({
    apikey: config.bungieAPIKey_2,
    userAgent: 'https://sgelites.com', //used to identify your request to the API
    oauthClientId: config.bungieOAuthClientId,
    oauthClientSecret: config.bungieOAuthSecret,
    debug: false
});

const characterId = '2305843009342464743';
const destinyMembershipId = '4611686018474971535';
const membershipType = 4;

// Manifest reference: https://data.destinysets.com/
// Live manifest: https://destiny.plumbing/

const manifest = {
  'VendorDefinition': 'https://destiny.plumbing/en/raw/DestinyVendorDefinition.json',
  'ItemDefinition': 'https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json'
};

const vendorHash = {
  'Suraya Hawthorne': '3347378076',
  /* 'Ada-1': '2917531897', */
  'Banshee-44': '672118013',
  'Spider': '863940356',
  'Lord Shaxx': '3603221665',
  'The Drifter': '248695599',
  'Lord Saladin': '895295461',
  'Commander Zavala': '69482069',
  'Xur': '2190858386',
  'Tess Everis': '3361454721',
  'Petra Venj': '1841717884'
};

// const authUrl = traveler.generateOAuthURL();
// console.log( authUrl );
// const accessCode = '79b66a9b1ee1939b27e1eaf6c8561ae7';

// Get oauth token info
getRefreshToken().then(function(accessToken){
  traveler.refreshToken(accessToken).then(async oauth => {
    // Provide your traveler object with the oauth object. This is later used for making authenticated calls
    traveler.oauth = oauth;

    // Save new oauth info for next request
    await pool.query("INSERT INTO oauth_token SET data = ?, date_added = ?", [
      JSON.stringify( oauth ),
      moment().format("YYYY-MM-DD HH:mm:ss")
    ]);

    // To store vendor items' hash keys
    let saleItemsHash = {};

    // Set default vendor names as keys
    Object.keys(vendorHash).forEach(function(key){
      saleItemsHash[key] = [];
    });

    // Get item definitions
    itemDefinition = await getItemDefinition();

    // Get item hash of vendor items
    await traveler.getVendors(membershipType, destinyMembershipId, characterId, { components: [402, 400, 302, 305] }).then(function(response){

      // console.log( response.Response.sales.data['863940356'].saleItems[2].costs );

      for(var vendor in saleItemsHash) {
        if( vendorHash[vendor] in response.Response.sales.data ) {
          saleItemsHash[ vendor ] = Object.keys( response.Response.sales.data[ vendorHash[vendor] ].saleItems ).map(function(key){

            // Get perks of sales item
            let perks = [];

            if( response.Response.itemComponents[ vendorHash[vendor] ] && response.Response.itemComponents[ vendorHash[vendor] ].sockets.data[ key ] ) {
              if( response.Response.itemComponents[ vendorHash[vendor] ].sockets.data[ key ].sockets.length > 0 ) {

                let sockets = response.Response.itemComponents[ vendorHash[vendor] ].sockets.data[ key ].sockets;
                // let perksInterested = ['Intrinsic', 'Armor Perk', 'Barrel', 'Magazine', 'Grip', 'Scope'];
                let perksExcluded = ['Trait', 'Restore Defaults']; // traits = stats, restore default == shader

                for(var i=0; i<sockets.length; i++) {
                  if( sockets[i].plugHash &&
                    itemDefinition[ sockets[i].plugHash ] &&
                    itemDefinition[ sockets[i].plugHash ].itemTypeDisplayName &&
                    // perksInterested.includes(itemDefinition[ sockets[i].plugHash ].itemTypeDisplayName) &&
                    sockets[i].reusablePlugs &&
                    perksExcluded.includes( itemDefinition[ sockets[i].plugHash ].itemTypeDisplayName ) == false &&
                    sockets[i].reusablePlugs.length > 0 // Only get perks where there are more than 1 to choose from aka not fixed
                  ){
                    let perkGroup = []; // put into sub groups so we know which perks can be chosen per slot

                    for(var j=0; j<sockets[i].reusablePlugs.length; j++) {
                      if( sockets[i].reusablePlugs[j].canInsert == true ) {
                        perkGroup.push( itemDefinition[ sockets[i].reusablePlugs[j].plugItemHash ] );
                      }
                    }
                    perks.push( perkGroup );
                  }
                }
              }
            }

            return {
              hash: response.Response.sales.data[ vendorHash[vendor] ].saleItems[key].itemHash,
              cost: response.Response.sales.data[ vendorHash[vendor] ].saleItems[key].costs,
              perks: perks
            }
          })
        }
      }
    });

    // To store vendor items' detailed info
    let saleItems = {};

    // Set default vendor names as keys
    Object.keys(vendorHash).forEach(function(key){
      saleItems[key] = [];
    });

    var no = 0;

    for(var vendor in saleItemsHash) {
      for(var i=0; i<saleItemsHash[vendor].length; i++) {
        let itemHash = saleItemsHash[ vendor ][i].hash;
        let costHash = null; // cost item's hash
        let costAmount = null;
        let costName = null;

        if( saleItemsHash[ vendor ][i].cost.length > 0 ) {
          costHash = saleItemsHash[ vendor ][i].cost[0].itemHash;
          costAmount = saleItemsHash[ vendor ][i].cost[0].quantity;
          costName = itemDefinition[costHash].displayProperties.name;
        }

        saleItems[vendor].push( itemDefinition[itemHash] );

        item = {
          itemTypeDisplayName: itemDefinition[itemHash].itemTypeDisplayName,
          itemTypeAndTierDisplayName: itemDefinition[itemHash].itemTypeAndTierDisplayName,
          hash: itemDefinition[itemHash].hash,
          vendor_hash: vendorHash[vendor],
          description: itemDefinition[itemHash].displayProperties.description,
          name: itemDefinition[itemHash].displayProperties.name,
          icon: itemDefinition[itemHash].displayProperties.hasIcon == true ? itemDefinition[itemHash].displayProperties.icon : '',
          cost: costAmount,
          cost_hash: costHash,
          cost_name: costName,
          date_added: moment().format('YYYY-MM-DD H:00:00')
        };

        // ON DUPLICATE KEY UPDATE cost = '" + costAmount + "', cost_hash = '" + costHash + "', cost_name = '" + costName + "'"

        await pool.query("INSERT INTO vendor_sales SET ?", item)
        .then(async function(result){
          if( saleItemsHash[ vendor ][i].perks.length > 0 ) {
            for(var j=0; j<saleItemsHash[ vendor ][i].perks.length; j++) { // perk group
              for(var k=0; k<saleItemsHash[ vendor ][i].perks[j].length; k++) { // perks inside a group
                let p = {
                  vendor_sales_id: result.insertId,
                  perk_group: j,
                  date_added: moment().format('YYYY-MM-DD H:00:00'),
                  description: saleItemsHash[ vendor ][i].perks[j][k].displayProperties.description,
                  name: saleItemsHash[ vendor ][i].perks[j][k].displayProperties.name,
                  icon: saleItemsHash[ vendor ][i].perks[j][k].displayProperties.hasIcon == true ? saleItemsHash[ vendor ][i].perks[j][k].displayProperties.icon : '',
                  itemTypeDisplayName: saleItemsHash[ vendor ][i].perks[j][k].itemTypeDisplayName,
                  itemTypeAndTierDisplayName: saleItemsHash[ vendor ][i].perks[j][k].itemTypeAndTierDisplayName,
                  hash: saleItemsHash[ vendor ][i].perks[j][k].hash
                };

                await pool.query("INSERT INTO vendor_sales_item_perks SET ?", p);
              }
            }
          }
        })
        .catch(function(e){
          console.log("Error Code: " + e.errno + " >>> " + e.sqlMessage);
        });

        no++;
      }
    }

    if( no > 0 ) {
      await pool.query("DELETE FROM vendor_sales WHERE date_added != ? AND vendor_hash != ?", [moment().format('YYYY-MM-DD H:00:00'), '2917531897'])
      .catch(function(e){
        console.log("Error Code: " + e.errno + " >>> " + e.sqlMessage);
      });
    }

    console.log( no + " items inserted." );
    // console.log( saleItems['Petra Venj'] );

    // Bye!
    process.exit();
  }).catch(err => {
    console.log(err)
    process.exit();
  });
});

async function getItemDefinition() {
  let data = {};

  await axios.get('https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json').then(function(response){
    data = response.data;
  });

  return data;
}

async function getAccessToken() {
  let accessToken = 0;

  await pool.query("SELECT * FROM oauth_token WHERE 1 ORDER BY id DESC LIMIT 1").then(function(result){
    accessToken = JSON.parse(result[0].data).access_token;
  });

  return accessToken;
}

async function getRefreshToken() {
  let refreshToken = 0;

  await pool.query("SELECT * FROM oauth_token WHERE 1 ORDER BY id DESC LIMIT 1").then(function(result){
    refreshToken = JSON.parse(result[0].data).refresh_token;
  });

  return refreshToken;
}
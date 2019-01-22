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

const characterId = '2305843009339205184';
const destinyMembershipId = '4611686018474971535';
const membershipType = 4;

// Manifest reference: https://data.destinysets.com/
// Live manifest: https://destiny.plumbing/

const manifest = {
  'VendorDefinition': 'https://destiny.plumbing/en/raw/DestinyVendorDefinition.json',
  'ItemDefinition': 'https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json'
};

const vendorHash = {
  'Ada-1': '2917531897',
  /*
  'Suraya Hawthorne': '3347378076',
  'Banshee-44': '672118013',
  'Spider': '863940356',
  'Lord Shaxx': '3603221665',
  'The Drifter': '248695599',
  'Lord Saladin': '895295461',
  'Commander Zavala': '69482069',
  'Xur': '2190858386',
  'Tess Everis': '3361454721',
  'Petra Venj': '1841717884'
  */
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

    // Get item hash of vendor items
    await traveler.getVendors(membershipType, destinyMembershipId, characterId, { components: [402, 400] }).then(function(response){

      // console.log( response.Response.sales.data['863940356'].saleItems[2].costs );

      for(var vendor in saleItemsHash) {
        if( vendorHash[vendor] in response.Response.sales.data ) {
          saleItemsHash[ vendor ] = Object.keys( response.Response.sales.data[ vendorHash[vendor] ].saleItems ).map(function(key){
            return {
              hash: response.Response.sales.data[ vendorHash[vendor] ].saleItems[key].itemHash,
              cost: response.Response.sales.data[ vendorHash[vendor] ].saleItems[key].costs
            }
          })
        }
      }
    });

    // Get item info of items vendor is selling
    itemDefinition = await getItemDefinition();

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
        .catch(function(e){
          console.log("Error Code: " + e.errno + " >>> " + e.sqlMessage);
        });

        no++;
      }
    }

    if( no > 0 ) {
      await pool.query("DELETE FROM vendor_sales WHERE date_added != ?", [moment().format('YYYY-MM-DD H:00:00')])
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
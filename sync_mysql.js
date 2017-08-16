const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const request = require('request');
const sleep = require('sleep');
const Claim = require('./models/claim.js')
const client = new bitcoin.Client({
    host: 'localhost',
    port: 9245,
    user: 'lbry',
    pass: 'lbry',
    timeout: 30000
});
let claimsSynced = 0;
let maxHeight;

async function sync (currentHeight) {
  try {
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      spinner.color = 'green';
      spinner.text = `Current block: ${currentHeight}/${maxHeight} | TotalClaimsFound: ${claimsSynced}`
      sync(currentHeight+1);
    } else {
      //process.exit(0);
      spinner.color = 'yellow'; 
      spinner.text = `Waiting for new blocks (last block: ${maxHeight})...`;
      maxHeight = await client.getBlockCount().then(blockHash => {return blockHash}).catch( err => { throw err });
      setTimeout(sync, 120000, currentHeight);
    }
  } catch (err) {
    spinner.color = 'red';
    spinner.text = `Error with block: ${currentHeight}, ${err}`;
    setTimeout(sync, 10000, currentHeight - 1);
  }
}

function isStreamType({ value }){
  return value.claimType === 'streamType';
}

function isFree({ value }){
  return (!value.stream.metadata.fee || value.stream.metadata.fee.amount === 0);
}

function cleanString(input) {
  let output = "";
  for (let i=0; i<input.length; i++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i);
    }
  }
  return output;
}

function send(arr){ // Modular change output here :)
  arr.forEach(function(claim) { 
    // Check if our value is an object, else make it an object...
    claim['value'] = (typeof claim.value == "object" ? claim.value : JSON.parse(claim.value));
    // Create a record if the claim is for a free, streamType claim
    if (isStreamType(claim) && isFree(claim)) {
      // 1. prepare the data
      let claimData = {};
      claimData['nOut'] = claim.nOut;
      claimData['name'] = claim.name;
      claimData['claimId'] = claim.claimId;
      claimData['height'] = claim.height;
      claimData['txid'] = claim.txid;
      claimData['outpoint'] = `${claim.txid}:${claim.nOut}`;
      if (claim.value) {
        claimData['valueVersion'] = claim.value.version;
        claimData['claimType'] = claim.value.claimType;
        if (claim.value.publisherSignature){
          claimData['certificateId'] = claim.value.publisherSignature.certificateId;
        }
        if (claim.value.stream) {
          claimData['streamVersion'] = claim.value.stream.version;
          if (claim.value.stream.metadata) {
            claimData['author'] = claim.value.stream.metadata.author;
            claimData['description'] = cleanString(claim.value.stream.metadata.description);
            claimData['language'] = claim.value.stream.metadata.language;
            claimData['license'] = claim.value.stream.metadata.license;
            claimData['licenseUrl'] = claim.value.stream.metadata.licenseUrl;
            claimData['nsfw'] = claim.value.stream.metadata.nsfw;
            claimData['preview'] = claim.value.stream.metadata.preview;
            claimData['thumbnail'] = claim.value.stream.metadata.thumbnail;
            claimData['title'] = cleanString(claim.value.stream.metadata.title);
            claimData['metadataVersion'] = claim.value.stream.metadata.version;
          }
          if (claim.value.stream.source) {
            claimData['contentType'] = claim.value.stream.source.contentType;
            claimData['source'] = claim.value.stream.source.source;
            claimData['sourceType'] = claim.value.stream.source.sourceType;
            claimData['sourceVersion'] = claim.value.stream.source.version;
          }
        }
      }
      // 2. store in mysql db
      Claim.upsertOne(
        claimData,
        `name = "${claimData.name}" AND claimId = "${claimData.claimId}"`
      )
      .catch(error => {
        console.log('mysql error:', error);
      })
    }
  });
}

console.log(chalk.green.underline.bold('Running LBRYSync v0.0.1rc1'))
const spinner = ora('Loading LBRYsync..').start();
client.getBlockCount()  // get the max height and then start the sync
  .then(blockHash => {
    maxHeight = blockHash;
    sync(224300) // Block to start from... :)
  })
  .catch( err => { 
    console.log('startup error:', err)
  });

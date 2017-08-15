const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const request = require('request');
const sleep = require('sleep');
const RequestQueue = require("limited-request-queue");
const Claim = require('./models/claim.js')
const client = new bitcoin.Client({
    host: 'localhost',
    port: 9245,
    user: 'lbry',
    pass: 'lbry',
    timeout: 30000
});
let queue = new RequestQueue({maxSockets: 1, rateLimit: 5}, {
  item: function(input, done) {
    request.post(input.url, {json:input.data})
    .on('response', function(response) {
        done()
    })
  },
  end: function() {
  }
});
let claimsSynced=0;

async function sync (currentHeight) {
  try {
    let maxHeight = await client.getBlockCount().then(blockHash => {return blockHash}).catch( err => { return err });
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      spinner.color = 'green';
      spinner.text = `Current block: ${currentHeight}/${maxHeight} | TotalClaimsImported: ${claimsSynced} | SendQueue: ${queue.numQueued()}`
      sync(currentHeight+1);
    } else {
      spinner.color = 'yellow'; 
      spinner.text = `Waiting for new blocks... | SendQueue: ${queue.numQueued()}`;
      if(queue.numQueued() < 1){
      sleep.sleep(5);
      sync(currentHeight);  
      }else{
      sync(currentHeight); 
      }
    }
  } catch (err) {
    spinner.color = 'red';
    spinner.text = ('Error with block: %s, %s', currentHeight, err);
  }
}

function isStreamType({ value }){
  //console.log('VALUE', value);
  return value.claimType === 'streamType';
}

function isFree({ value }){
  //console.log('VALUE', value);
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
      //console.log('claim found:', JSON.stringify(claim, undefined, 2))
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
      // 2. store in mysql
      //console.log('claim found:', JSON.stringify(claimData, undefined, 2))
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
sync(210000)// Block to start from... :)

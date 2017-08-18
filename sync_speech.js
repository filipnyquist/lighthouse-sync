const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const Claim = require('./models/claim.js')
const lbrynetApi = require('./lbrynetApi');
const client = new bitcoin.Client({
    host: 'localhost',
    port: 9245,
    user: '******',
    pass: '******',
    timeout: 30000
});
let claimsSynced = 0;
let maxHeight;
const startHeight = (parseInt(process.argv[2]) || 0);
const throttle = (parseInt(process.argv[3]) || 100);

async function sync (currentHeight) {
  try {
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      spinner.color = 'green';
      spinner.text = `Current block: ${currentHeight}/${maxHeight} | TotalClaimsFound: ${claimsSynced}`
      if (claims.length >= 1){
        const waitTime = throttle * claims.length;
        console.log(`block wait time: ${waitTime}`);
        setTimeout(sync, waitTime, currentHeight+1);
      } else {
        sync(currentHeight+1)
      }
      
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

function createClaimDataFromResolve(claim){
  let claimData = {};
  claimData['name'] = claim.name;
  claimData['claimId'] = claim.claimId;
  claimData['address'] = claim.address;
  claimData['amount'] = claim.amount;
  claimData['claimId'] = claim.claim_id;
  claimData['claimSequence'] = claim.claim_sequence;
  claimData['decodedClaim'] = claim.decoded_claim;
  claimData['depth'] = claim.depth;
  claimData['effectiveAmount'] = claim.effective_amount;
  claimData['hasSignature'] = claim.has_signature;
  claimData['height'] = claim.height;
  claimData['hex'] = claim.hex;
  claimData['name'] = claim.name;
  claimData['nOut'] = claim.nout;
  claimData['txid'] = claim.txid;
  claimData['validAtHeight'] = claim.valid_at_height;
  claimData['outpoint'] = `${claim.txid}:${claim.nout}`;
  if (claim.value) {
    claimData['valueVersion'] = claim.value.version;
    claimData['claimType'] = claim.value.claimType;
    if (claim.value.publisherSignature){
      claimData['certificateId'] = claim.value.publisherSignature.certificateId;
    }
    if (claim.value.stream) {
      claimData['streamVersion'] = claim.value.stream.version;
      if (claim.value.stream.metadata) {
        claimData['metadataVersion'] = claim.value.stream.metadata.version;
        claimData['author'] = claim.value.stream.metadata.author;
        claimData['description'] = cleanString(claim.value.stream.metadata.description);
        claimData['language'] = claim.value.stream.metadata.language;
        claimData['license'] = claim.value.stream.metadata.license;
        claimData['licenseUrl'] = claim.value.stream.metadata.licenseUrl;
        claimData['nsfw'] = claim.value.stream.metadata.nsfw;
        claimData['preview'] = claim.value.stream.metadata.preview;
        claimData['thumbnail'] = claim.value.stream.metadata.thumbnail;
        claimData['title'] = cleanString(claim.value.stream.metadata.title);
      }
      if (claim.value.stream.source) {
        claimData['sourceVersion'] = claim.value.stream.source.version;
        claimData['contentType'] = claim.value.stream.source.contentType;
        claimData['source'] = claim.value.stream.source.source;
        claimData['sourceType'] = claim.value.stream.source.sourceType;
      }
    }
  }
  return claimData;
};

function resolveAndStoreClaim(claim){
  console.log(`\nresolving and storing ${claim.name} ${claim.claimId}`);
  // 1. prepare the data
  lbrynetApi.resolveUri(`${claim.name}#${claim.claimId}`)
  .then(result => {
    //console.log('\nresolve result:', result)
    return claimData = createClaimDataFromResolve(result);
  })
  // 2. store in mysql db
  .then(claimData => {
    //console.log('\nclaimdata:', claimData)
    const updateCriteria = `name = "${claim.name}" AND claimId = "${claim.claimId}"`;
    return Claim.upsertOne(claimData, updateCriteria)
  })
  .catch(error => {
      console.log('\n SEND ERROR', error);
    });
}

function send(arr){ // Modular change output here :)
  arr.forEach(function(claim, index) { 
    if (isStreamType(claim) && isFree(claim)) {
      const sendBuffer = throttle * (1 / arr.length) * (index + 1);
      console.log(`send buffer: ${sendBuffer}`);
      setTimeout(resolveAndStoreClaim, sendBuffer, claim);
    }
  });
}

console.log(chalk.green.underline.bold('Running LBRYSync v0.0.1rc1'))
const spinner = ora('Loading LBRYsync..').start();
client.getBlockCount()  // get the max height and then start the sync
  .then(blockHash => {
    maxHeight = blockHash;
    sync(startHeight) // Block to start from... :)
  })
  .catch( err => { 
    console.log('\nstartup error:', err)
  });

const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const db = require('./models');
const lbrynetApi = require('./lbrynetApi');
const bitcoinConfig = require('./config/bitcoinConfig.js');
const logger = require('winston');
const client = new bitcoin.Client(bitcoinConfig);
let claimsSynced = 0;
let maxHeight;
const startHeight = require('./config/syncConfig.js').startHeight || 0;
const throttle = require('./config/syncConfig.js').throttle || 5000;

require('./config/loggerConfig.js')(logger, 'debug') //configure winston
require('./config/slackLoggerConfig.js')(logger);

async function sync (currentHeight) {
  try {
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      logger.info(`Current block: ${currentHeight}/${maxHeight} | TotalClaimsSinceRestart: ${claimsSynced}`);
      if (claims.length >= 1){
        const waitTime = throttle * claims.length;
        // logger.verbose(`block wait time: ${waitTime}`);
        setTimeout(sync, waitTime, currentHeight+1);
      } else {
        sync(currentHeight+1)
      }
      
    } else {
      //process.exit(0);
      logger.verbose(`Waiting for new blocks (last block: ${maxHeight})...`);
      maxHeight = await client.getBlockCount().then(blockHash => {return blockHash}).catch( err => { throw err });
      setTimeout(sync, 120000, currentHeight);
    }
  } catch (err) {
    logger.error(`Error with block: ${currentHeight}, ${err}`);
    setTimeout(sync, 10000, currentHeight - 1);
  }
}

function isStreamType(claim){
  if (!claim.value.claimType){
    logger.debug(`txid ${claim.txid} does not have a claim type`, claim);
  }
  logger.debug(`checking isStreamType? ${claim.name} ${claim.value.claimType}`);
  return claim.value.claimType === 'streamType';
}

function isCertificateType({ name, value }){
  logger.debug(`checking isCertificateType? ${name} ${value.claimType}`);
  return value.claimType === 'certificateType';
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
  // logger.debug('resolve result:', claim)
  let claimData = {};
  claimData['address'] = claim.address;
  claimData['amount'] = claim.amount;
  claimData['channelName'] = claim.channel_name;
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
  if (claim.valid_at_height) { claimData['validAtHeight'] = claim.valid_at_height; }
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
    if (claim.value.certificate) {
      claimData['certificateVersion'] = claim.value.certificate.version;
      claimData['keyType'] = claim.value.certificate.keyType;
      claimData['publicKey'] = claim.value.certificate.publicKey;
    }
  }
  return claimData;
};

function resolveAndStoreClaim(claim){
  logger.verbose(`resolving ${claim.name}#${claim.claimId}`);
  // 1. resolve the claim
  lbrynetApi.resolveUri(`${claim.name}#${claim.claimId}`)
  .then(result => {
    let claimData, upsertCriteria;
    // 2. format the resolve data for storage in Claim or Certificate table
    claimData = createClaimDataFromResolve(result);
    // 3. store the data
    upsertCriteria = { name: claimData.name, claimId: claimData.claimId};
    logger.debug('upsert criteria:', upsertCriteria);
    switch (claimData.claimType) {
        case 'streamType':
            return db.Claim.upsert(claimData, upsertCriteria);
        case 'certificateType':
            return db.Certificate.upsert(claimData, upsertCriteria);
        default:
            logger.error(`claim ${claimData.name} neither streamType nor certificateType`);
            logger.debug('claimdata:', claimData);
            break;
    };
  })
  .catch(error => {
      logger.error('ResolveAndStoreClaim error', error);
    });
}

function send(arr){ // Modular change output here :)
  arr.forEach(function(claim, index) { 
    if (isStreamType(claim) && isFree(claim) || isCertificateType(claim)) {
      const sendBuffer = throttle * index;
      // logger.verbose(`send buffer: ${sendBuffer}`);
      setTimeout(resolveAndStoreClaim, sendBuffer, claim);
    }
  });
}

logger.verbose(chalk.green.underline.bold('Running Spee.chSync'));
db.sequelize
  .sync() // sync sequelize
  .then(() => {
    return client.getBlockCount()  // get the max height and then start the sync
  })
  .then(blockHash => {
    console.log('block hash', blockHash);
    maxHeight = blockHash;
    sync(startHeight) // Block to start from... :)
  })
  .catch( err => { 
    logger.error('startup error:', err)
  });

const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const request = require('request');
const sleep = require('sleep');
const RequestQueue = require("limited-request-queue");

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
    let maxHeight = await client.getBlockCount().then(blockHash => {return blockHash}).catch( err => reject(err));
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      spinner.color = 'green';
      spinner.text = `Current block: ${currentHeight}/${maxHeight} | TotalClaimsImported: ${claimsSynced} | SendQueue: ${queue.numQueued()} `
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

function send(arr){ // Modular change output here :)
arr.forEach(function(claim) { 
console.log(claim);
});
}

console.log(chalk.green.underline.bold('Running LBRYSync v0.0.1rc1'))
const spinner = ora('Loading LBRYsync..').start();
sync(0)// Block to start from... :)

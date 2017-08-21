const axios = require('axios');

module.exports = {
  resolveUri (uri) {
    //console.log(`\nlbryApi >> Resolving URI...`);
    // console.log('resolving uri', uri);
    return new Promise((resolve, reject) => {
      axios
        .post('http://localhost:5279/lbryapi', {
          method: 'resolve',
          params: { uri },
        })
        .then(({ data }) => {
          //console.log('\nresolve data:', data)
          if (data.result[uri].error) {  // check for errors
            reject(data.result[uri].error);
          } else if (data.result[uri].claim) {  // if no errors, resolve
            resolve(data.result[uri].claim);
          } else if (data.result[uri].certificate) {  // if no errors, resolve
            resolve(data.result[uri].certificate);
          } else {
            throw new Error('resolve returned something that was not a claim')
          }
        })
        .catch(error => {
          console.log('\nerror with resolve', error);
          reject(error);
        });
    });
  },
};

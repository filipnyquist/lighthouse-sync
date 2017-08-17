const orm = require('../config/orm.js');

const claimModel = {
  // method for inserting one claim into claim table
  createOne: (valuesObject) => {
    const columns = [];
    const values = [];
    for (let prop in valuesObject) {
      if (valuesObject.hasOwnProperty(prop)) {
        columns.push(prop);
        values.push(valuesObject[prop]);
      }
    }
    columns.push('createdAt');
    columns.push('updatedAt');
    const dateNow= new Date;
    const dateTimeNow = dateNow.toISOString().slice(0, 19).replace('T', ' ');
    values.push(dateTimeNow)
    values.push(dateTimeNow);
    return orm.insertOne('Claim', columns, values);
  },
  // method to insert or update one claim, as necessary
  upsertOne: (valuesObject, condition) => {
    return orm.findAll('Claim', 'id', condition)
    .then(result => {
      if (result.length > 1) {
        console.log('\nfindAll results length ==', result.length);
        console.log('\nresults:', result);
        return new Error('more than one matching record was found');
      } else if (result.length === 1) {
        const columns = [];
        const values = [];
        for (let prop in valuesObject) {
          if (valuesObject.hasOwnProperty(prop)) {
            columns.push(prop);
            values.push(valuesObject[prop]);
          }
        }
        const dateNow = new Date;
        const dateTimeNow = dateNow.toISOString().slice(0, 19).replace('T', ' ');
        columns.push('updatedAt');
        values.push(dateTimeNow);
        console.log(`\nupdating Claim ${valuesObject.claimId}`);
        return orm.updateOne('Claim', columns, values, `id = ${result[0].id}`);
      } else {
        const columns = [];
        const values = [];
        for (let prop in valuesObject) {
          if (valuesObject.hasOwnProperty(prop)) {
            columns.push(prop);
            values.push(valuesObject[prop]);
          }
        }
        columns.push('createdAt');
        columns.push('updatedAt');
        const dateNow= new Date;
        const dateTimeNow = dateNow.toISOString().slice(0, 19).replace('T', ' ');
        values.push(dateTimeNow)
        values.push(dateTimeNow);
        console.log(`\ninserting Claim ${valuesObject.claimId}`);
        return orm.insertOne('Claim', columns, values);
      }
    })
    .catch(error => {
      return error;
    });
  },
};

module.exports = claimModel;
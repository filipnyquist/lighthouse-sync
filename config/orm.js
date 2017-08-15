var db = require('./mysqlConnection.js');

// helper function to print question marks
function printQuestionMarks (number) {
  var array = [];
  for (var i = 0; i < number; i++) {
    array.push('?');
  };
  return array.join(','); 
};

// helper function turn an object into sql
function objectToSql (object) {
  var array = [];
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      array.push(`${key} = '${object[key]}'`);
    };
  };
  return array.join(', ');
};

var orm = {
  // method to add one row to a table based on one colum
  insertOne: function (tableName, columnsArray, valuesArray) {
    // parse the input
    var columns = ' (' + columnsArray.join(',') + ') ';
    // build the query
    var sqlQuery = 'INSERT INTO ' + tableName + columns; 
    sqlQuery += 'VALUES (' + printQuestionMarks(valuesArray.length) + ');';
    // make the query
    return new Promise((resolve, reject) => {
      db.query(sqlQuery, valuesArray, (err, rows, fields) => {
        if (err) { 
          return reject(err)
        };
        resolve(rows);
      });
    })
  },
  // method to find all from a table
  findAll: function (tableName, columns, condition) {
    var sqlQuery = 'SELECT ' + columns + ' ';
    sqlQuery += 'FROM ' + tableName + ' ';
    sqlQuery += 'WHERE ' + condition + ';' 
    return new Promise((resolve, reject) => {
      db.query(sqlQuery, null, (err, rows, fields) => {
        if (err) { 
          return reject(err) 
        };
        resolve(rows);
      });
    });
  },
  // method to update one entry
  updateOne: function (tableName, columns, values, condition) {
    let sqlQuery = 'UPDATE ' + tableName + ' ';
    sqlQuery += 'SET ' + columns.join(' = ? , ') + ' = ? ';
    sqlQuery += 'WHERE ' + condition + ';';
    return new Promise((resolve, reject) => {
      db.query(sqlQuery, values, (err, rows, fields) => {
        if (err) { 
          return reject(err)
        };
        resolve(rows);
      });
    })
  },
};

module.exports = orm;


const mysql = require('mysql');
let connection;

if (process.env.MYSQLDB_URL) {
  connection = mysql.createConnection(process.env.MYSQLDB_URL);
} else {
  connection = mysql.createConnection({
    host    : 'localhost',
    port    : 3306,
    user    : 'root',
    password: 'JW55cw04',
    database: 'lbry',
  });
};

connection.connect(function (error) {
  if (error) {
    console.log('An error occured connecting to MySQL:', error);
    return;
  }
  console.log('Connected to MySQL as connection:', connection.threadId);
});

module.exports = connection;

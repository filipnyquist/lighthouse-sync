const mysql = require('mysql');

const connection = mysql.createConnection({
  host    : 'localhost',
  port    : 3306,
  user    : process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || '*****',
  database: 'lbry',
});

connection.connect(function (error) {
  if (error) {
    console.log('\nAn error occured connecting to MySQL:', error);
    return;
  }
  console.log('\nConnected to MySQL as connection:', connection.threadId);
});

module.exports = connection;
const mysql = require('mysql');
let connection;

if (process.env.MYSQL_CONNECTION_STRING) {
  connection = mysql.createConnection(process.env.MYSQL_CONNECTION_STRING);
} else {
  connection = mysql.createConnection({
    host    : 'localhost',
    port    : 3306,
    user    : 'root',
    password: '*******',
    database: '*******',
  });
};

connection.connect(function (error) {
  if (error) {
    console.log('\nAn error occured connecting to MySQL:', error);
    return;
  }
  console.log('\nConnected to MySQL as connection:', connection.threadId);
});

module.exports = connection;
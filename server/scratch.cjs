require('dotenv').config();
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chroniclev8'
}).then(conn => 
  conn.query('SELECT * FROM applications WHERE first_name = "Jovanni" AND last_name = "Bastian"')
  .then(([rows]) => {
    console.log(JSON.stringify(rows, null, 2));
    conn.end();
  })
).catch(e => console.error(e));

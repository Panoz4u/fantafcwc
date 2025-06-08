const mysql = require("mysql2");

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port:     process.env.MYSQL_PORT || 3306,
  // queste due righe indicano al driver di non fare offset e lavorare in UTC
  timezone: 'Z',
  dateStrings: false
});

// Forziamo la time_zone della sessione a UTC
pool.query("SET time_zone = '+00:00';", (err) => {
  if (err) {
    console.error("Errore settando time_zone su UTC:", err);
  } else {
    console.log("Sessione MySQL impostata su UTC");
  }
});

module.exports = pool;
// index.js (o db.js)
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",  // MySQLSVR
  user: "root",       // MySQLUID
  password: "pass",   // MySQLPWD
  database: "fanteextest", // MySQLDB
  port: 3306               // MySQLPRT
});

// Esempio di query di prova:
pool.query("SELECT 1 + 1 AS solution", (err, results) => {
  if (err) {
    console.error("Errore di connessione:", err);
  } else {
    console.log("Connessione OK! Risultato:", results[0].solution);
  }
});

module.exports = pool;


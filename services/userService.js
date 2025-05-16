// services/userService.js
const pool = require('./db');  // import della connessione MySQL

/**
 * Restituisce tutti gli utenti attivi.
 */
async function findAll() {
  const sql = `
    SELECT
      user_id    AS id,
      username,
      uniquename,
      email,
      teex_balance AS balance,
      is_active    AS active,
      updated_at   AS updatedAt,
      avatar,
      color,
      google_id    AS googleId
    FROM users
    WHERE is_active = 1
  `;
  // pool.promise() ci permette di usare await/async
  const [rows] = await pool.promise().query(sql);
  return rows;
}

/**
 * Restituisce un singolo utente o null
 */
async function findById(id) {
    const [rows] = await pool.promise().query(
      'SELECT * FROM users WHERE user_id = ?', [id]
    );
    return rows[0] || null;
  }
  
/**
 * Crea un nuovo utente e restituisce il suo ID.
 */
async function create(data) {
    const { username, email, teex_balance, avatar, color, google_id, uniquename } = data;
    const [result] = await pool.promise().query(
      `INSERT INTO users
        (username, email, teex_balance, is_active, updated_at, avatar, color, google_id, uniquename)
       VALUES (?, ?, ?, 1, NOW(), ?, ?, ?, ?)`,
      [
        username,
        email,
        teex_balance  || 500,
        avatar       || '',
        color        || '',
        google_id    || '',
        uniquename   || username
      ]
    );
    return { id: result.insertId };
  }


/**
 * Aggiorna i campi di un utente e restituisce l’utente aggiornato.
 */
async function update(id, data) {
    // Costruiamo dinamicamente la lista di assegnazioni
    const fields = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    // Eseguiamo l’UPDATE
    await pool.promise().query(
      `UPDATE users SET ${fields} WHERE user_id = ?`,
      [...values, id]
    );
    // Ritorniamo l’utente aggiornato
    const [rows] = await pool.promise().query(
      'SELECT * FROM users WHERE user_id = ?',
      [id]
    );
    return rows[0] || null;
  }
  
  
/**
 * Cancella un utente dal database.
 * @param {string|number} id 
 */
async function remove(id) {
    await pool.promise().query(
      'DELETE FROM users WHERE user_id = ?',
      [id]
    );
  }

/**
 * Cerca un utente per email, restituisce la riga (o null).
 */
async function findByEmail(email) {
    const [rows] = await pool.promise().query(
      'SELECT user_id AS userId, username, email, teex_balance AS balance, avatar, color, google_id AS googleId FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }
  

// Restituisce  dati per l'header della Landing . services/userService.js
// services/userService.js

async function getLandingInfo(userId) {
  const [rows] = await pool.promise().query(
    `SELECT
       user_id       AS id,
       username,
       teex_balance  AS balance,
       avatar,
       color
     FROM users
     WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}


  module.exports = { findAll, create, findById, update, remove, findByEmail, getLandingInfo };
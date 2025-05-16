// services/userService.js
const pool = require('./db');

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}

async function create(data) {
  const { username, email, teex_balance, color, avatar } = data;
  const [result] = await pool.query(
    'INSERT INTO users (username, email, teex_balance, color, avatar) VALUES (?, ?, ?, ?, ?)',
    [username, email, teex_balance, color, avatar]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  const fields = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(data);
  await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, update, remove };

// services/authService.js
const pool = require('./db');           // connessione MySQL
const jwt = require('jsonwebtoken');
const firebaseAdmin = require('firebase-admin');
// ... importa e inizializza Firebase Admin se serve

// genera un token con scadenza 1h
async function generateToken({ userId }) {
  if (!userId) throw new Error('Manca userId per generare il token');
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  return { token };
}

// verifica che il token e il userId combacino
async function verifyToken({ token, userId }) {
  if (!token || !userId) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.userId.toString() === userId.toString();
  } catch {
    return false;
  }
}
// services/authService.js

// … le tue funzioni generateToken e verifyToken …


module.exports = { generateToken, verifyToken };


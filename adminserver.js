// Importa le dipendenze necessarie
const express = require('express');
const path = require('path');
const cors = require('cors');
const router = express.Router();

// Middleware
router.use(cors());

// Endpoint per ottenere la configurazione Firebase
router.get('/api/firebase-config', (req, res) => {
  // Verifica se la richiesta proviene da un'origine autorizzata
  const origin = req.headers.origin || req.headers.referer;
  if (!origin || (!origin.includes('fantaconclave') && !origin.includes('localhost'))) {
    return res.status(403).json({ error: 'Accesso non autorizzato' });
  }

  // Restituisci solo i dati necessari per l'autenticazione client
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  res.json(firebaseConfig);
});

// Endpoint per verificare l'autenticazione dell'amministratore
router.post('/api/check-admin-auth', (req, res) => {
  const { email, idToken } = req.body;
  
  if (!email || !idToken) {
    return res.status(400).json({ error: 'Dati di autenticazione mancanti' });
  }
  
  // Qui dovresti verificare il token con Firebase Admin SDK
  // Per ora, facciamo un controllo semplice sull'email
  const adminEmail = 'admin@fantaconclave.it';
  
  if (email === adminEmail) {
    return res.json({ isAdmin: true });
  } else {
    return res.json({ isAdmin: false });
  }
});

// Endpoint per servire la pagina di amministrazione
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'FanteexBackend.html'));
});

// Endpoint per gestire l'upload dei risultati
router.post('/api/admin/upload-results', (req, res) => {
  // Implementa la logica per l'upload dei risultati
  // Questo è solo un esempio
  const { results } = req.body;
  
  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Formato dati non valido' });
  }
  
  // Qui dovresti elaborare i risultati e salvarli nel database
  
  return res.json({ success: true, message: 'Risultati caricati con successo' });
});

// Endpoint per gestire l'upload delle lineup
router.post('/api/admin/upload-lineups', (req, res) => {
  // Implementa la logica per l'upload delle lineup
  // Questo è solo un esempio
  const { lineups } = req.body;
  
  if (!lineups || !Array.isArray(lineups)) {
    return res.status(400).json({ error: 'Formato dati non valido' });
  }
  
  // Qui dovresti elaborare le lineup e salvarle nel database
  
  return res.json({ success: true, message: 'Lineup caricate con successo' });
});

// Endpoint per chiudere le sfide scadute
router.post('/api/admin/close-expired-challenges', (req, res) => {
  // Implementa la logica per chiudere le sfide scadute
  // Questo è solo un esempio
  
  // Qui dovresti identificare e chiudere le sfide scadute nel database
  
  return res.json({ success: true, message: 'Sfide scadute chiuse con successo' });
});

// Esporta il router per essere utilizzato in index.js
module.exports = router;
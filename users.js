const express = require('express');
const router = express.Router();
const pool = require('./services/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Chiave segreta per i JWT (meglio metterla in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'chiave_segreta_molto_sicura';

// Middleware per verificare il token JWT
const authenticateToken = (req, res, next) => {
  // Ottieni il token dall'header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: "Token di autenticazione mancante" });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token non valido o scaduto" });
    }
    
    req.user = user;
    next();
  });
};

/* Endpoint per generare token JWT */
router.post("/generate-token", (req, res) => {
  const { email, userId } = req.body;
  
  if (!email && !userId) {
    return res.status(400).json({ error: "È necessario fornire email o userId" });
  }
  
  let query;
  let params;
  
  if (email) {
    query = "SELECT user_id, username, email, teex_balance, avatar, color FROM users WHERE email = ? AND is_active = 1";
    params = [email];
  } else {
    query = "SELECT user_id, username, email, teex_balance, avatar, color FROM users WHERE user_id = ? AND is_active = 1";
    params = [userId];
  }
  
  pool.query(query, params, (err, results) => {
    if (err) {
      console.error("Errore nella query utente:", err);
      return res.status(500).json({ error: "Errore nel database" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    
    const user = results[0];
    
    // Crea il token JWT
    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.email,
        username: user.username
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' } // Il token scade dopo 7 giorni
    );
    
    res.json({ 
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        teexBalance: user.teex_balance,
        avatar: user.avatar,
        color: user.color
      }
    });
  });
});

/* Endpoint per ottenere informazioni utente dal token */
router.get("/user-info", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  const query = "SELECT user_id, username, email, teex_balance, avatar, color FROM users WHERE user_id = ? AND is_active = 1";
  
  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Errore nella query utente:", err);
      return res.status(500).json({ error: "Errore nel database" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    
    const user = results[0];
    
    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      teexBalance: user.teex_balance,
      avatar: user.avatar,
      color: user.color
    });
  });
});

/* GET /users */
router.get("/", (req, res) => {
  // Se vuoi restituire solo gli utenti attivi, usa la WHERE is_active = 1
  const sql = `
    SELECT 
      user_id,
      username,
      email,
      teex_balance,
      is_active,
      updated_at,
      avatar,
      google_id
    FROM users
    WHERE is_active = 1
  `;
  pool.query(sql, (err, rows) => {
    if (err) {
      console.error("Errore DB in GET /users:", err);
      return res.status(500).json({ error: "DB error /users" });
    }
    res.json(rows);
  });
});

/* POST /users */
router.post("/", (req, res) => {
  const { username, email, teex_balance, avatar, google_id, uniquename, color } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: "Dati mancanti: 'username' ed 'email' sono obbligatori" });
  }
  
  const balance = teex_balance || 500;
  const isActive = 1;
  // Se avatar è presente, lo usiamo direttamente (sarà l'URL di Google)
  const finalAvatar = avatar || "";
  const finalGoogleId = google_id || "";
  const finalUniquename = uniquename || username;
  const finalColor = color || "ff5500"; // Colore predefinito se non specificato
  
  // Prima verifichiamo se l'utente esiste già (per evitare duplicati)
  const checkSql = "SELECT user_id FROM users WHERE email = ?";
  pool.query(checkSql, [email], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Errore nella verifica dell'utente:", checkErr);
      return res.status(500).json({ error: "Errore nella verifica dell'utente" });
    }
    
    if (checkResult.length > 0) {
      // L'utente esiste già, restituiamo l'ID esistente
      return res.json({
        message: "Utente già esistente",
        userId: checkResult[0].user_id
      });
    }
    
    // L'utente non esiste, procediamo con l'inserimento
    const sql = `
      INSERT INTO users 
        (username, email, teex_balance, is_active, updated_at, avatar, google_id, uniquename, color)
      VALUES 
        (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    `;
    
    const params = [username, email, balance, isActive, finalAvatar, finalGoogleId, finalUniquename, finalColor];
    
    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error("Errore INSERT /users:", err);
        return res.status(500).json({ error: "Errore nell'inserimento utente" });
      }
      
      res.json({
        message: "Utente creato con successo!",
        userId: result.insertId
      });
    });
  });
});

/* Endpoint per il login con email e password */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email e password sono obbligatorie" });
  }
  
  try {
    // Cerca l'utente nel database
    const query = "SELECT * FROM users WHERE email = ? AND is_active = 1";
    
    pool.query(query, [email], async (err, results) => {
      if (err) {
        console.error("Errore nella query utente:", err);
        return res.status(500).json({ error: "Errore nel database" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      
      const user = results[0];
      
      // Verifica la password (se hai implementato bcrypt)
      if (user.password_hash) {
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
          return res.status(401).json({ error: "Password non valida" });
        }
      } else {
        // Se non hai implementato bcrypt, controlla la password in chiaro (non sicuro!)
        if (user.password !== password) {
          return res.status(401).json({ error: "Password non valida" });
        }
      }
      
      // Crea il token JWT
      const token = jwt.sign(
        { 
          userId: user.user_id,
          email: user.email,
          username: user.username
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' } // Il token scade dopo 7 giorni
      );
      
      res.json({ 
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          teex_balance: user.teex_balance,
          avatar: user.avatar,
          color: user.color
        }
      });
    });
  } catch (error) {
    console.error("Errore durante il login:", error);
    res.status(500).json({ error: "Errore durante il login" });
  }
});


/* Endpoint per registrare un nuovo utente */
router.post('/register-user', async (req, res) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;
    
    if (!email || !uid) {
      return res.status(400).json({ error: 'Dati utente incompleti' });
    }
    
    // Inserisci l'utente nella tabella users
    const query = 'INSERT INTO users (email, display_name, photo_url, uid) VALUES (?, ?, ?, ?)';
    
    pool.query(query, [email, displayName, photoURL, uid], (err) => {
      if (err) {
        console.error('Errore durante la registrazione dell\'utente:', err);
        return res.status(500).json({ error: 'Errore del server' });
      }
      
      return res.json({ success: true });
    });
  } catch (error) {
    console.error('Errore durante la registrazione dell\'utente:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

// Esporta il router e le funzioni utili
module.exports = {
  router,
  authenticateToken,
  JWT_SECRET
};
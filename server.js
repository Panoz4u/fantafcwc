// ... codice esistente ...

// Endpoint per verificare se un utente esiste già
app.get('/api/check-user', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email non specificata' });
    }
    
    // Controlla se l'utente esiste nella tabella users
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await pool.query(query, [email]);
    
    return res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error('Errore durante la verifica dell\'utente:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

// Endpoint per registrare un nuovo utente
app.post('/api/register-user', async (req, res) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;
    
    if (!email || !uid) {
      return res.status(400).json({ error: 'Dati utente incompleti' });
    }
    
    // Inserisci l'utente nella tabella users
    const query = 'INSERT INTO users (email, display_name, photo_url, uid) VALUES (?, ?, ?, ?)';
    await pool.query(query, [email, displayName, photoURL, uid]);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Errore durante la registrazione dell\'utente:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
});

// Server startup code with port 3000 and fallback mechanism
const PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10;

function startServer(port, attempt = 1) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.log(`Port ${port} is already in use. Trying port ${nextPort}...`);
      startServer(nextPort, attempt + 1);
    } else {
      console.error('Failed to start server:', err.message);
    }
  });
}

startServer(PORT);
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

// Aggiungi questo endpoint per gestire l'upload dei match

app.post('/api/matches/upload', async (req, res) => {
  const { matches } = req.body;
  
  if (!matches || !Array.isArray(matches)) {
    return res.status(400).json({ message: 'Formato dati non valido.' });
  }
  
  const result = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  try {
    for (const match of matches) {
      try {
        if (match.match_id) {
          // Aggiorna un match esistente
          // Prepara i campi da aggiornare
          const updateFields = {};
          const allowedFields = [
            'event_unit_id', 'home_team', 'away_team', 
            'home_score', 'away_score', 'status', 'match_date', 
            'updated_at'
          ];
          
          allowedFields.forEach(field => {
            if (match[field] !== undefined) {
              updateFields[field] = match[field];
            }
          });
          
          // Verifica se ci sono campi da aggiornare
          if (Object.keys(updateFields).length > 0) {
            const updateQuery = `
              UPDATE matches 
              SET ${Object.keys(updateFields).map(field => `${field} = ?`).join(', ')}
              WHERE match_id = ?
            `;
            
            const updateValues = [...Object.values(updateFields), match.match_id];
            
            await new Promise((resolve, reject) => {
              db.run(updateQuery, updateValues, function(err) {
                if (err) {
                  reject(err);
                } else {
                  if (this.changes > 0) {
                    result.updated++;
                  } else {
                    // Il match_id non esiste, quindi lo creiamo come nuovo
                    createNewMatch(match)
                      .then(() => {
                        result.created++;
                        resolve();
                      })
                      .catch(reject);
                  }
                  resolve();
                }
              });
            });
          }
        } else {
          // Crea un nuovo match
          await createNewMatch(match);
          result.created++;
        }
      } catch (matchError) {
        result.errors.push(`Errore per il match ${match.match_id || 'nuovo'}: ${matchError.message}`);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Errore durante l\'elaborazione dell\'upload:', error);
    res.status(500).json({ message: 'Errore durante l\'elaborazione dell\'upload.', errors: [error.message] });
  }
  
  // Funzione interna per creare un nuovo match
  async function createNewMatch(match) {
    const fields = Object.keys(match).filter(key => match[key] !== undefined);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => match[field]);
    
    const insertQuery = `
      INSERT INTO matches (${fields.join(', ')})
      VALUES (${placeholders})
    `;
    
    return new Promise((resolve, reject) => {
      db.run(insertQuery, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
});
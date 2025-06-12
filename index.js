// 1) IMPORT e CONST
require('dotenv').config();
const path    = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const pool    = require('./services/db');

const authRoutes            = require('./routes/auth');
const usersRoutes           = require('./routes/users');
const firebaseConfigRoutes  = require('./routes/firebase-config');
const adminContestRoutes    = require('./routes/admincontest');
const adminRouter           = require('./adminserver');
const userContestsRoutes    = require('./routes/userContests');
const athleteRoutes = require('./routes/athletes');
const { getAvatarUrl, getAvatarSrc } = require("./utils/avatarUtils");
const matchController = require("./controllers/matchController");
const leagueRoutes = require('./routes/leagueRoutes');
const leagueDetailsRoutes  = require('./routes/leagueDetails');

// upload bulk CSV/XLSX
const multer  = require('multer');
const XLSX    = require('xlsx');
const fs      = require('fs');
const http  = require('http');
const https = require('https');

// i nostri nuovi router
const uploadTeamsRoute    = require('./uploadTeams');
const uploadAthletesRoute = require('./uploadAthletes');
const uploadMatchesRoute  = require('./uploadMatches');


// 2) INIT
const app  = express();
app.use(express.json());
const contestsRouter       = require('./routes/contests');
app.use('/contests', contestsRouter);

app.use(express.urlencoded({ extended: true })); // se serve
const port = process.env.PORT || 3000;


// 4) STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
global.getAvatarUrl = getAvatarUrl;
global.getAvatarSrc = getAvatarSrc;
app.get('/js/avatar-functions.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/js/avatar-functions.js'));
});

// 3) GLOBAL MIDDLEWARE
app.use(bodyParser.json());


// 5) ROUTES

app.use('/api/users',        require('./routes/users'));
app.use('/api/user-contests', require('./routes/userContests')); 
app.use(authRoutes);
app.use('/', adminRouter);
app.use('/api', firebaseConfigRoutes);
app.use('/admin-api', adminContestRoutes);
app.use('/api', athleteRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/contests', leagueDetailsRoutes);

// 6) ROUTE AD HOC
app.get('/gestione-sfide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gestione-sfide.html'));
});
app.get('/js/gestione-sfide.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'js', 'gestione-sfide.js'));
});

// 7) ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Errore interno' });
});



// Create a router for the API endpoints
const sfideRouter = express.Router();

// Define the API routes for contests
sfideRouter.get('/contests/list', async (req, res) => {
  try {
    const contests = await dbsfide.getAllContests();
    res.json(contests);
  } catch (error) {
    console.error('Errore nel recupero delle sfide:', error);
    res.status(500).json({ error: 'Errore nel recupero delle sfide' });
  }
});

sfideRouter.delete('/contests/:id', async (req, res) => {
  try {
    const result = await dbsfide.deleteContest(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Errore nella cancellazione della sfida:', error);
    res.status(500).json({ error: 'Errore nella cancellazione della sfida' });
  }
});

sfideRouter.post('/contests/bulk-delete', async (req, res) => {
  try {
    const result = await dbsfide.deleteMultipleContests(req.body.contestIds);
    res.json(result);
  } catch (error) {
    console.error('Errore nella cancellazione delle sfide:', error);
    res.status(500).json({ error: 'Errore nella cancellazione delle sfide' });
  }
});

sfideRouter.get('/contests/count-expired', async (req, res) => {
  try {
    const count = await dbsfide.countExpiredContests();
    res.json({ count });
  } catch (error) {
    console.error('Errore nel conteggio delle sfide scadute:', error);
    res.status(500).json({ error: 'Errore nel conteggio delle sfide scadute' });
  }
});

sfideRouter.post('/contests/delete-expired', async (req, res) => {
  try {
    const result = await dbsfide.deleteExpiredContests();
    res.json(result);
  } catch (error) {
    console.error('Errore nella cancellazione delle sfide scadute:', error);
    res.status(500).json({ error: 'Errore nella cancellazione delle sfide scadute' });
  }
});

// Use the router for the API endpoints
app.use('/api', sfideRouter);





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

// Fallback su index.html se nessun'altra route viene trovata
const uploadResultsRoute = require("./uploadResults"); // Assicurati che il percorso sia corretto
app.use("/uploadResults", uploadResultsRoute);

// Registriamo ora il router fantasyresult.js nella cartella “routes/”
const fantasyResultRoutes = require('./routes/fantasyresult');
app.use('/fantasy', fantasyResultRoutes);

// Usa le routes
app.use("/uploadResults", uploadResultsRoute);

// Keep the direct route handler for /user-landing-info if needed,
// or move it into contests.js under the path /user-landing-info
app.get("/user-landing-info", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  // Verifica che l'ID utente sia presente
  if (!userId) {
    return res.status(400).json({ error: "ID utente mancante nel token" });
  }

  const sqlUser = "SELECT user_id, username, teex_balance, avatar, color FROM users WHERE user_id = ?";
  pool.query(sqlUser, [userId], (err, ur) => {
    if (err) return res.status(500).json({ error: "DB error user" });
    if (!ur.length) return res.status(404).json({ error: "User not found" });
    const userData = ur[0];
    const sqlC = `
      SELECT c.contest_id, c.status, cs.status_name, c.stake,
             c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar, ow.color AS owner_color,
             ft_o.total_cost AS owner_cost, ft_o.fantasy_team_id AS owner_team_id, 
             ft_o.total_points AS owner_points, ft_o.ft_result AS owner_result, ft_o.ft_teex_won AS owner_teex_won,
             c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar, op.color AS opponent_color,
             ft_p.total_cost AS opponent_cost, ft_p.fantasy_team_id AS opponent_team_id,
             ft_p.total_points AS opponent_points, ft_p.ft_result AS opponent_result, ft_p.ft_teex_won AS opponent_teex_won,
             c.event_unit_id, c.multiply
      FROM contests c
      JOIN contests_status cs ON c.status = cs.status_id
      JOIN users ow ON c.owner_user_id = ow.user_id
      JOIN users op ON c.opponent_user_id = op.user_id
      LEFT JOIN fantasy_teams ft_o ON (ft_o.contest_id = c.contest_id AND ft_o.user_id = c.owner_user_id)
      LEFT JOIN fantasy_teams ft_p ON (ft_p.contest_id = c.contest_id AND ft_p.user_id = c.opponent_user_id)
      WHERE c.owner_user_id = ? OR c.opponent_user_id = ?
    `;
    pool.query(sqlC, [userId, userId], (er2, contests) => {
      if (er2) {
        console.error("Errore nella query contests:", er2);
        return res.status(500).json({ error: "DB error contests" });
      }

      const active = [];
      const completed = [];
      contests.forEach(r => {
        if(r.status === 5) completed.push(r);
        else active.push(r);
      });

      res.json({ user: userData, active, completed });
    });
  });
});


/* 2) Nuovo endpoint per ottenere informazioni utente dal token */
app.get("/user-info", authenticateToken, (req, res) => {
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

/* 1) GET /users */
app.get("/users", authenticateToken, (req, res) => {
  // Parametri di paginazione e ordinamento
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 40;
  const offset = (page - 1) * limit;
  
  // Parametri di ordinamento
  const sortField = req.query.sort === 'name' ? 'username' : 'teex_balance';
  const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
  
  // Parametro di ricerca
  const searchTerm = req.query.search || '';
  
  // Costruisci la query di base
  let sql = `
    SELECT 
      user_id,
      username,
      email,
      teex_balance,
      is_active,
      updated_at,
      avatar,
      google_id,
      color
    FROM users
    WHERE is_active = 1
  `;
  
  // Aggiungi condizione di ricerca se presente
  const params = [];
  if (searchTerm) {
    sql += ` AND (username LIKE ? OR email LIKE ?)`;
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }
  
  // Aggiungi ordinamento
  sql += ` ORDER BY ${sortField} ${sortOrder}`;
  
  // Query per contare il totale degli utenti
  const countSql = `
    SELECT COUNT(*) as total
    FROM users
    WHERE is_active = 1
    ${searchTerm ? 'AND (username LIKE ? OR email LIKE ?)' : ''}
  `;
  
  // Esegui la query di conteggio
  pool.query(countSql, searchTerm ? [`%${searchTerm}%`, `%${searchTerm}%`] : [], (countErr, countResult) => {
    if (countErr) {
      console.error("Errore nel conteggio degli utenti:", countErr);
      return res.status(500).json({ error: "Errore nel conteggio degli utenti" });
    }
    
    const total = countResult[0].total;
    
    // Aggiungi paginazione alla query principale
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Esegui la query principale
    pool.query(sql, params, (err, rows) => {
      if (err) {
        console.error("Errore DB in GET /users:", err);
        return res.status(500).json({ error: "DB error /users" });
      }
      
      // Restituisci i risultati con il totale
      res.json({
        users: rows,
        total: total,
        page: page,
        limit: limit,
        pages: Math.ceil(total / limit)
      });
    });
  });
});

/*****************************
 * POST /users
 *****************************/
app.post("/users", (req, res) => {
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

/* Endpoint per verificare l'unicità del nome utente */
app.get("/check-username", (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: "Nome utente mancante" });
  }
  
  const sql = "SELECT user_id FROM users WHERE uniquename = ?";
  pool.query(sql, [username], (err, rows) => {
    if (err) {
      console.error("Errore nella verifica del nome utente:", err);
      return res.status(500).json({ error: "Errore del database" });
    }
    
    if (rows.length > 0) {
      // Il nome utente esiste già
      return res.status(200).json({ exists: true });
    } else {
      // Il nome utente non esiste
      return res.status(404).json({ exists: false });
    }
  });
});

/* Endpoint per ottenere un utente tramite email */
app.get("/user-by-email", (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email mancante" });
  }
  
  const sql = "SELECT * FROM users WHERE email = ?";
  pool.query(sql, [email], (err, rows) => {
    if (err) {
      console.error("Errore nel recupero dell'utente tramite email:", err);
      return res.status(500).json({ error: "Errore del database" });
    }
    
    if (rows.length > 0) {
      return res.json(rows[0]);
    } else {
      return res.status(404).json({ error: "Utente non trovato" });
    }
  });
});

// GET /current-event-unit
app.get("/current-event-unit", (req, res) => {
  // Qui selezioniamo l'unità evento corrente: status = 3
  const sql = "SELECT event_unit_id FROM event_units WHERE status = 4 LIMIT 1";
  pool.query(sql, (err, rows) => {
    if (err) {
      console.error("Error in GET /current-event-unit:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Current event unit not found" });
    }
    
    res.json(rows[0]);
  });
});

/* --------------------------- */
/* Rotta di test base ("/") */
app.get("/", (req, res) => {
  res.send("Ciao da fanteex!");
});

/* --------------------------- */
/* GET /athlete-details?id=XX */
app.get("/athlete-details", (req, res) => {
  const athleteId = req.query.id;
  if (!athleteId) return res.status(400).json({ error: "Missing athlete id parameter" });
  
  const sql = `
    SELECT athlete_id, athlete_name, athlete_shortname, position, picture
    FROM athletes
    WHERE athlete_id = ?
  `;
  
  pool.query(sql, [athleteId], (err, rows) => {
    if (err) {
      console.error("Error in GET /athlete-details:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    res.json(rows[0]);
  });  
});

// Aggiungi questa riga dopo la dichiarazione di uploadResultsRoute
const uploadLineupsRoute = require("./uploadLineups");
// Aggiungi questa riga dopo app.use("/uploadResults", uploadResultsRoute);
app.post("/api/matches/upload", matchController.uploadMatches);
app.post("/api/matches/update-past", matchController.updatePastMatches);
app.use("/uploadLineups", uploadLineupsRoute);
// → mount dei nuovi router bulk‐upload
app.use("/uploadTeams",    uploadTeamsRoute);
app.use("/uploadAthletes", uploadAthletesRoute);
app.use("/uploadMatches",  uploadMatchesRoute);


// Rileva se siamo in produzione
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  // percorsi Certbot – in prod i certificati sono già in /etc/letsencrypt
   const key  = fs.readFileSync('/etc/letsencrypt/live/www.fantafcwc.it/privkey.pem',  'utf8');
   const cert = fs.readFileSync('/etc/letsencrypt/live/www.fantafcwc.it/fullchain.pem','utf8');

  // 1) HTTPS su 443
  https.createServer({ key, cert }, app)
       .listen(443, '0.0.0.0', () => console.log('✅ HTTPS su 443'));

  // 2) HTTP su 80 che redirige a HTTPS
  http.createServer((req, res) => {
    const host = req.headers.host.split(':')[0];
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
  }).listen(80, '0.0.0.0', () => {
    console.log('🔁 HTTP→HTTPS su 0.0.0.0:80');
  });

} else {
  // sviluppo: solo HTTP su porta da env o 3000
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`⚙️  HTTP DEV su porta ${port}`);
  });
}

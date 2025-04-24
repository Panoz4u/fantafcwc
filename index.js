require('dotenv').config();
const path = require('path');
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const pool = require("./db");
const jwt = require('jsonwebtoken'); // Aggiungi questa riga
const bcrypt = require('bcrypt'); // Aggiungi questa riga se vuoi gestire password
app.use(express.json());
app.use(express.static("public"));

// Chiave segreta per i JWT (meglio metterla in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'chiave_segreta_molto_sicura'; // Aggiungi questa riga

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

/* 1) Nuovo endpoint per generare token JWT */
app.post("/generate-token", (req, res) => {
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
app.get("/users", (req, res) => {
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
/* 2) POST /contests (creare una nuova sfida) */
app.post("/contests", (req, res) => {
  const { owner, opponent, event_unit_id, multiply } = req.body;  // Added multiply to destructuring
  if (!owner || !opponent) return res.status(400).json({ error: "Owner or Opponent missing" });
    // Set default multiply value to 1 if not specified
  const multiplyValue = multiply || 1;
    // Updated query to insert multiply field
  const sql = `
    INSERT INTO contests (owner_user_id, opponent_user_id, contest_type, stake, status, created_at, event_unit_id, multiply)
    VALUES (?, ?, 'head_to_head', 0, 0, NOW(), ?, ?)
  `;
  pool.query(sql, [owner, opponent, event_unit_id, multiplyValue], (er, rs) => {
    if (er) {
      console.error("Error creating contest", er);
      return res.status(500).json({ error: "DB error creating contest" });
    }
    res.json({ message: "Contest creato con successo", contestId: rs.insertId });
  });
});
/* --------------------------- */
/* 3) GET /event-players?event=30 */
app.get("/event-players", (req, res) => {
  const eventUnitId = req.query.event_unit_id;
  if (!eventUnitId) return res.status(400).json({ error: "Missing event unit ID" });
    const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, aep.event_unit_id, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
           m.home_team, m.away_team, m.status AS match_status,
           ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
           ht.team_name AS home_team_name, at.team_name AS away_team_name,
           t.team_3letter AS player_team_code, t.team_name AS player_team_name,
           m.match_id
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    LEFT JOIN teams t ON a.team_id = t.team_id
    LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
    LEFT JOIN teams ht ON m.home_team = ht.team_id
    LEFT JOIN teams at ON m.away_team = at.team_id
    WHERE aep.event_unit_id = ? AND aep.status = 1
  `;
  pool.query(sql, [eId], (er, rows) => {
    if (er) {
      console.error("DB error /event-players", er);
      return res.status(500).json({ error: "DB error /event-players" });
    }
    res.json(rows);
  });
});
/* Nuovo endpoint per ottenere tutti gli atleti con status = 1 */
app.get("/all-active-athletes", (req, res) => {
  const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, aep.event_unit_id, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
           m.home_team, m.away_team, m.status AS match_status,
           ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
           ht.team_name AS home_team_name, at.team_name AS away_team_name,
           t.team_3letter AS player_team_code, t.team_name AS player_team_name,
           m.match_id
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    LEFT JOIN teams t ON a.team_id = t.team_id
    LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
    LEFT JOIN teams ht ON m.home_team = ht.team_id
    LEFT JOIN teams at ON m.away_team = at.team_id
    WHERE aep.status = 1
  `;
    pool.query(sql, (er, rows) => {
    if (er) {
      console.error("DB error /all-active-athletes", er);
      return res.status(500).json({ error: "DB error /all-active-athletes" });
    }
    res.json(rows);
  });
});
/* --------------------------- */
/* 4) GET /user-landing-info - Modificato per usare autenticazione JWT */
app.get("/user-landing-info", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Ottieni l'ID utente dal token JWT
  
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
      // Per ogni contest, se lo status è 4 e almeno un atleta ha is_ended=1, computiamo il risultato parziale.
      let pending = contests.length;
      if (pending === 0) {
        return res.json({ user: userData, active: [], completed: [] });
      }
      contests.forEach((contest, idx) => {
        // Aggiungiamo i dati dei fantasy teams per i contest completati (status 5)
        if (contest.status == 5) {
          // Prepara i dati dei fantasy teams per il frontend
          contest.fantasy_teams = [];
           // Aggiungi il team dell'owner
          if (contest.owner_team_id) {
            contest.fantasy_teams.push({
              user_id: contest.owner_id,
              fantasy_team_id: contest.owner_team_id,
              total_points: contest.owner_points,
              ft_result: contest.owner_result,
              ft_teex_won: contest.owner_teex_won
            });
          }
           // Aggiungi il team dell'opponent
          if (contest.opponent_team_id) {
            contest.fantasy_teams.push({
              user_id: contest.opponent_id,
              fantasy_team_id: contest.opponent_team_id,
              total_points: contest.opponent_points,
              ft_result: contest.opponent_result,
              ft_teex_won: contest.opponent_teex_won
            });
          }
          checkDone();
        }
        else if (contest.status == 4) {
          // Eseguiamo la query per calcolare il risultato parziale
          const sqlTeam = `
            SELECT fte.*, fte.aep_id, a.athlete_shortname, a.picture, a.position, a.team_id, aep.event_unit_id  AS event_unit_id, aep.is_ended,
                   COALESCE(ROUND(aep.athlete_unit_points, 1), 0) AS athlete_points,
                   m.home_team, m.away_team,
                   ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
                   ht.team_name AS home_team_name, at.team_name AS away_team_name,
                   t.team_3letter AS player_team_code, t.team_name AS player_team_name
            FROM fantasy_team_entities fte
            JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
            JOIN athletes a ON fte.athlete_id = a.athlete_id
            JOIN teams t ON a.team_id = t.team_id
            LEFT JOIN athlete_eventunit_participation aep 
                   ON a.athlete_id = aep.athlete_id AND aep.event_unit_id = ?
            LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
            LEFT JOIN teams ht ON m.home_team = ht.team_id
            LEFT JOIN teams at ON m.away_team = at.team_id
            WHERE ft.contest_id = ? AND ft.user_id = ?
          `;
          console.log("Eseguo query team owner per contest:", contest.contest_id, "event_unit:", contest.event_unit_id, "owner_id:", contest.owner_id);
          const eventUnit = contest.event_unit_id || 0;
          pool.query(sqlTeam, [eventUnit, contest.contest_id, contest.owner_id], (err2, owRows) => {
            if (err2) {
              console.error("Error in owner team query (user-landing):", err2);
              contest.status_display = contest.status_name;
              checkDone();
            } else {
              pool.query(sqlTeam, [eventUnit, contest.contest_id, contest.opponent_id], (err3, oppRows) => {
                if (err3) {
                  console.error("Error in opponent team query (user-landing):", err3);
                  contest.status_display = contest.status_name;
                } else {
                  let partialEnded = false;
                  owRows.forEach(r => { if(r.is_ended == 1) partialEnded = true; });
                  oppRows.forEach(r => { if(r.is_ended == 1) partialEnded = true; });
                  if (partialEnded) {
                    let sumOwner = owRows.reduce((acc, r) => acc + parseFloat(r.athlete_points || 0), 0);
                    let sumOpponent = oppRows.reduce((acc, r) => acc + parseFloat(r.athlete_points || 0), 0);
                    // In user-landing, il current user è quello passato in query
                    if (parseInt(userId) === parseInt(contest.owner_id)) {
                      contest.status_display = `${sumOwner.toFixed(1)}-${sumOpponent.toFixed(1)}`;
                    } else {
                      contest.status_display = `${sumOpponent.toFixed(1)}-${sumOwner.toFixed(1)}`;
                    }
                  } else {
                    contest.status_display = contest.status_name;
                  }
                }
                checkDone();
              });
            }
          });
        } else {
          contest.status_display = contest.status_name;
          checkDone();
        }
      });
      function checkDone() {
        pending--;
        if (pending === 0) {
          const active = [];
          const completed = [];
          contests.forEach(r => {
            if(r.status === 5) completed.push(r);
            else active.push(r);
          });
          res.json({ user: userData, active, completed });
        }
      }
    });
  });
});
/* --------------------------- */
/* 5) GET /contest-details?contest=XX */
app.get("/contest-details", (req, res) => {
  const cId = req.query.contest;
  const currentUser = req.query.user;
  if (!cId) return res.status(400).json({ error: "Missing contest param" });
  const sql = `
    SELECT c.contest_id, c.status, cs.status_name, c.stake,
           c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar,
           ft_o.total_cost AS owner_cost, ft_o.fantasy_team_id AS owner_team_id, 
           ft_o.total_points AS owner_points, ft_o.ft_result AS owner_result, ft_o.ft_teex_won AS owner_teex_won,
           c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar,
           ft_p.total_cost AS opponent_cost, ft_p.fantasy_team_id AS opponent_team_id,
           ft_p.total_points AS opponent_points, ft_p.ft_result AS opponent_result, ft_p.ft_teex_won AS opponent_teex_won,
           c.event_unit_id, c.multiply
    FROM contests c
    JOIN contests_status cs ON c.status = cs.status_id
    JOIN users ow ON c.owner_user_id = ow.user_id
    JOIN users op ON c.opponent_user_id = op.user_id
    LEFT JOIN fantasy_teams ft_o ON (ft_o.contest_id = c.contest_id AND ft_o.user_id = c.owner_user_id)
    LEFT JOIN fantasy_teams ft_p ON (ft_p.contest_id = c.contest_id AND ft_p.user_id = c.opponent_user_id)
    WHERE c.contest_id = ?
  `;
  pool.query(sql, [cId], (er, rows) => {
    if (er) return res.status(500).json({ error: "DB error /contest-details" });
    if (!rows.length) return res.status(404).json({ error: "Contest non trovato" });
    const contestData = rows[0];
    // Prepara i dati dei fantasy teams per i contest completati (status 5)
    if (contestData.status == 5) {
      contestData.fantasy_teams = [];
      // Aggiungi il team dell'owner
      if (contestData.owner_team_id) {
        contestData.fantasy_teams.push({
          user_id: contestData.owner_id,
          fantasy_team_id: contestData.owner_team_id,
          total_points: contestData.owner_points,
          ft_result: contestData.owner_result,
          ft_teex_won: contestData.owner_teex_won
        });
      }
      // Aggiungi il team dell'opponent
      if (contestData.opponent_team_id) {
        contestData.fantasy_teams.push({
          user_id: contestData.opponent_id,
          fantasy_team_id: contestData.opponent_team_id,
          total_points: contestData.opponent_points,
          ft_result: contestData.opponent_result,
          ft_teex_won: contestData.opponent_teex_won
        });
      }
    }
    const sqlTeam = `
      SELECT fte.*, fte.aep_id, a.athlete_shortname, a.picture, a.position, a.team_id, aep.event_unit_id  AS event_unit_id, aep.is_ended,
             COALESCE(ROUND(aep.athlete_unit_points, 1), 0) AS athlete_points,
             m.home_team, m.away_team,
             ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
             ht.team_name AS home_team_name, at.team_name AS away_team_name,
             t.team_3letter AS player_team_code, t.team_name AS player_team_name
      FROM fantasy_team_entities fte
      JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
      JOIN athletes a ON fte.athlete_id = a.athlete_id
      JOIN teams t ON a.team_id = t.team_id
      LEFT JOIN athlete_eventunit_participation aep 
             ON a.athlete_id = aep.athlete_id AND aep.event_unit_id = ?
      LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
      LEFT JOIN teams ht ON m.home_team = ht.team_id
      LEFT JOIN teams at ON m.away_team = at.team_id
      WHERE ft.contest_id = ? AND ft.user_id = ?
    `;
    const eventUnit = contestData.event_unit_id || 0;
    console.log(`OWNER query - contest_id: ${contestData.contest_id}, user: ${contestData.owner_id}, event_unit: ${eventUnit}`);
    console.log(`OPPONENT query - contest_id: ${contestData.contest_id}, user: ${contestData.opponent_id}, event_unit: ${eventUnit}`);
    pool.query(sqlTeam, [eventUnit, cId, contestData.owner_id], (er2, owRows) => {
      if (er2) {
        console.error("Error in owner team query:", er2);
        return res.status(500).json({ error: "DB error owner team" });
      }
      pool.query(sqlTeam, [eventUnit, cId, contestData.opponent_id], (er3, oppRows) => {
        if (er3) {
          console.error("Error in opponent team query:", er3);
          return res.status(500).json({ error: "DB error opponent team" });
        }
        let partialEnded = false;
        owRows.forEach(r => { if (r.is_ended == 1) partialEnded = true; });
        oppRows.forEach(r => { if (r.is_ended == 1) partialEnded = true; });
        if (partialEnded) {
          let sumOwner = owRows.reduce((acc, r) => acc + (parseFloat(r.athlete_points) || 0), 0);
          let sumOpponent = oppRows.reduce((acc, r) => acc + (parseFloat(r.athlete_points) || 0), 0);
          if (parseInt(currentUser) === parseInt(contestData.owner_id)) {
            contestData.result = `${sumOwner.toFixed(1)}-${sumOpponent.toFixed(1)}`;
          } else {
            contestData.result = `${sumOpponent.toFixed(1)}-${sumOwner.toFixed(1)}`;
          }
        }
        contestData.status_display = partialEnded ? contestData.result : contestData.status_name;
        res.json({
          contest: contestData,
          ownerTeam: owRows,
          opponentTeam: oppRows
        });
      });
    });
  });
});
/* ----------------------------------------------------------------------
   6) POST /confirm-squad - Modificato per usare autenticazione JWT
---------------------------------------------------------------------- */
/* Endpoint per confermare la squadra */
app.post("/confirm-squad", authenticateToken, (req, res) => {
  const { contestId, userId, players, multiplier, totalCost } = req.body;
  
  // Verifica che i dati necessari siano presenti
  if (!contestId || !userId || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: "Dati mancanti o invalidi" });
  }
  
  // Verifica che l'utente autenticato corrisponda all'utente della richiesta
  if (req.user.userId != userId) {
    return res.status(403).json({ error: "Non sei autorizzato a confermare questa squadra" });
  }
  
  // Inizia una transazione per garantire l'integrità dei dati
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Errore nella connessione al database:", err);
      return res.status(500).json({ error: "Errore di connessione al database" });
    }
    
    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error("Errore nell'avvio della transazione:", err);
        return res.status(500).json({ error: "Errore nell'avvio della transazione" });
      }
      
      // Ottieni lo stato attuale del contest
      const sqlGetContest = "SELECT status, stake, owner_user_id, opponent_user_id FROM contests WHERE contest_id = ?";
      connection.query(sqlGetContest, [contestId], (err, contestResults) => {
        if (err) {
          return rollbackTransaction(connection, err, res, "Errore nella lettura del contest");
        }
        
        if (contestResults.length === 0) {
          return rollbackTransaction(connection, null, res, "Contest non trovato", 404);
        }
        
        const contest = contestResults[0];
        let newStatus = contest.status;
        
        // Aggiorna lo stato del contest in base a chi sta confermando la squadra
        if (newStatus === 0 && parseInt(userId) === contest.owner_user_id) {
          newStatus = 1; // Owner ha confermato
        } else if (newStatus === 1 && parseInt(userId) === contest.opponent_user_id) {
          newStatus = 2; // Opponent ha confermato
        } else if (newStatus !== 0 && newStatus !== 1) {
          return rollbackTransaction(connection, null, res, "Stato del contest non valido per la conferma", 400);
        }
        
        // Aggiorna il saldo Teex dell'utente
        updateUserBalance(connection, userId, totalCost, multiplier, (err) => {
          if (err) {
            return rollbackTransaction(connection, err, res, err.message);
          }
          
          // Aggiorna lo stato del contest
          const sqlUpdateContest = `
            UPDATE contests 
            SET status = ?, updated_at = NOW()
            WHERE contest_id = ?
          `;
          
          connection.query(sqlUpdateContest, [newStatus, contestId], (err) => {
            if (err) {
              return rollbackTransaction(connection, err, res, "Errore nell'aggiornamento del contest");
            }
            
            // Crea il fantasy team
            const sqlCreateTeam = `
              INSERT INTO fantasy_teams (contest_id, user_id, total_cost, updated_at)
              VALUES (?, ?, ?, NOW())
            `;
            
            connection.query(sqlCreateTeam, [contestId, userId, totalCost], (err, teamResult) => {
              if (err) {
                return rollbackTransaction(connection, err, res, "Errore nella creazione del fantasy team");
              }
              
              const fantasyTeamId = teamResult.insertId;
              
              // Prepara i valori per l'inserimento in batch dei giocatori
              const playerValues = players.map(p => [
                fantasyTeamId,
                p.athleteId,
                p.aep_id || null,
                p.event_unit_cost || 0
              ]);
              
              // Inserisci i giocatori nel fantasy team
              const sqlInsertPlayers = `
                INSERT INTO fantasy_team_entities 
                (fantasy_team_id, athlete_id, aep_id, cost)
                VALUES ?
              `;
              
              connection.query(sqlInsertPlayers, [playerValues], (err) => {
                if (err) {
                  return rollbackTransaction(connection, err, res, "Errore nell'inserimento dei giocatori");
                }
                
                // Commit della transazione
                connection.commit(err => {
                  if (err) {
                    return rollbackTransaction(connection, err, res, "Errore nel commit della transazione");
                  }
                  
                  connection.release();
                  res.json({ 
                    message: "Squadra confermata con successo",
                    fantasyTeamId,
                    newStatus
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  
  // Funzione di supporto per il rollback della transazione
  function rollbackTransaction(connection, err, res, message, statusCode = 500) {
    connection.rollback(() => {
      connection.release();
      if (err) console.error("Errore:", err);
      res.status(statusCode).json({ error: message });
    });
  }
});

/* Endpoint per verificare l'unicità del nome utente

Questo endpoint rimane invariato, poiché non fa riferimento al campo `user_color`:
```javascript
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
app.use("/uploadLineups", uploadLineupsRoute);

// Add a single app.listen call at the end of the file
app.listen(port, '0.0.0.0', () => {
  console.log(`Server avviato su http://0.0.0.0:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`La porta ${port} è già in uso. Assicurati che nessun altro processo stia utilizzando questa porta.`);
    process.exit(1); // Termina il processo invece di provare la porta successiva
  } else {
    console.error('Server error:', err);
  }
});


// Endpoint per gestire l'upload dei match
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
          
          if (Object.keys(updateFields).length > 0) {
            const updateQuery = `
              UPDATE matches 
              SET ${Object.keys(updateFields).map(field => `${field} = ?`).join(', ')}
              WHERE match_id = ?
            `;
            
            const updateValues = [...Object.values(updateFields), match.match_id];
            
            await new Promise((resolve, reject) => {
              pool.query(updateQuery, updateValues, function(err, queryResult) {
                if (err) {
                  reject(err);
                } else {
                  if (queryResult.affectedRows > 0) {
                    result.updated++;
                    resolve();
                  } else {
                    // Il match_id non esiste, quindi lo creiamo come nuovo
                    createNewMatch(match)
                      .then(() => {
                        result.created++;
                        resolve();
                      })
                      .catch(reject);
                  }
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
        console.error("Error processing match:", matchError);
        result.errors.push(`Errore per il match ${match.match_id || 'nuovo'}: ${matchError.message}`);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Errore durante l\'elaborazione dell\'upload:', error);
    res.status(500).json({ message: 'Errore durante l\'elaborazione dell\'upload.', errors: [error.message] });
  }
});

// Funzione per creare un nuovo match
async function createNewMatch(match) {
  const fields = Object.keys(match).filter(key => match[key] !== undefined);
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(field => match[field]);
  
  const insertQuery = `
    INSERT INTO matches (${fields.join(', ')})
    VALUES (${placeholders})
  `;
  
  return new Promise((resolve, reject) => {
    pool.query(insertQuery, values, function(err, queryResult) {
      if (err) {
        reject(err);
      } else {
        resolve(queryResult.insertId);
      }
    });
  });
}

// Add this endpoint after your existing /api/matches/upload endpoint

// Endpoint per aggiornare i match passati
app.post('/api/matches/update-past', async (req, res) => {
  try {
    // Query per trovare e aggiornare i match con date passate e status < 4
    const updateQuery = `
      UPDATE matches 
      SET status = 4, updated_at = NOW() 
      WHERE match_date < NOW() AND status < 4
    `;
    
    pool.query(updateQuery, (err, result) => {
      if (err) {
        console.error("Errore nell'aggiornamento dei match passati:", err);
        return res.status(500).json({ error: "DB error updating past matches" });
      }
      
      res.json({ 
        message: "Past matches updated successfully", 
        updatedCount: result.affectedRows 
      });
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dei match passati:', error);
    res.status(500).json({ 
      message: 'Errore durante l\'aggiornamento dei match passati.', 
      error: error.message 
    });
  }
});


// Funzione per aggiornare il saldo Teex dell'utente
function updateUserBalance(connection, userId, totalCost, multiplier, callback) {
  // Calcola il costo finale moltiplicato
  const finalCost = parseFloat(totalCost) * parseFloat(multiplier);
  
  // Verifica che finalCost sia un numero valido
  if (isNaN(finalCost)) {
    console.error("Errore: finalCost non è un numero valido.", { totalCost, multiplier });
    return callback(new Error("Costo finale non valido"));
  }
  
  console.log(`Aggiornamento Teex per userId: ${userId}, costo base: ${totalCost}, moltiplicatore: ${multiplier}, costo finale: ${finalCost}`);
  
  const sqlUser = `
    UPDATE users
    SET teex_balance = teex_balance - ?
    WHERE user_id = ? AND teex_balance >= ?
  `;
  
  // Esegui l'aggiornamento all'interno della transazione esistente
  connection.query(sqlUser, [finalCost, userId, finalCost], (err, result) => {
    if (err) {
      console.error("Errore DB nell'aggiornamento del saldo Teex:", err);
      return callback(err); // Passa l'errore alla callback
    }
    
    // Verifica se l'aggiornamento ha avuto effetto (se l'utente aveva abbastanza Teex)
    if (result.affectedRows === 0) {
      console.error(`Saldo Teex insufficiente per userId: ${userId} o utente non trovato.`);
      return callback(new Error("Saldo Teex insufficiente o utente non trovato"));
    }
    
    console.log(`Saldo Teex aggiornato con successo per userId: ${userId}`);
    callback(null); // Nessun errore
  });
}

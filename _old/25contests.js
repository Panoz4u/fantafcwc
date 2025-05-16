const express = require('express');
const router = express.Router();
const pool = require('./services/db');
const { authenticateToken } = require('./middleware/auth');

// Funzione di supporto per gestire i rollback delle transazioni
function rollbackTransaction(connection, err, res, message, statusCode = 500) {
  connection.rollback(() => {
    connection.release();
    if (err) console.error(message, err);
    return res.status(statusCode).json({ error: message });
  });
}

/* POST /contests (creare una nuova sfida) */
router.post("/", (req, res) => {
  const { owner, opponent, event_unit_id, multiply } = req.body;
  if (!owner || !opponent) return res.status(400).json({ error: "Owner or Opponent missing" });
  
  // Set default multiply value to 1 if not specified
  const multiplyValue = multiply || 1;
  
  // Updated query to insert multiply field
  const sql = `
    INSERT INTO contests (owner_user_id, opponent_user_id, contest_type, stake, status, created_at, updated_at, event_unit_id, multiply)
    VALUES (?, ?, 'head_to_head', 0, 0, NOW(), NOW(), ?, ?)
  `;
  
  pool.query(sql, [owner, opponent, event_unit_id, multiplyValue], (er, rs) => {
    if (er) {
      console.error("Error creating contest", er);
      return res.status(500).json({ error: "DB error creating contest" });
    }
    res.json({ message: "Contest creato con successo", contestId: rs.insertId });
  });
});

/* GET /user-landing-info - Modificato per usare autenticazione JWT */
router.get("/user-landing-info", authenticateToken, (req, res) => {
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

/* GET /contest-details?contest=XX */
router.get("/contest-details", authenticateToken, (req, res) => {
  // Ottieni i parametri dalla query string
  const cId = req.query.contest;
  const currentUser = req.query.user || req.user.userId;
  const eventUnitId = req.query.event_unit_id;
  
  if (!cId) return res.status(400).json({ error: "Missing contest param" });
  
  const sql = `
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
             t.team_3letter AS player_team_code, t.team_name AS player_team_name,
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
    const eventUnit = contestData.event_unit_id || eventUnitId || 0;
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

/* POST /contest-details - Nuova route per ricevere i parametri nel body */
router.post("/contest-details", authenticateToken, (req, res) => {
  // Ottieni i parametri dal body della richiesta
  const cId = req.body.contest_id;
  const currentUser = req.body.user_id || req.user.userId;
  const eventUnitId = req.body.event_unit_id;
  
  if (!cId) return res.status(400).json({ error: "Missing contest param" });
  
  const sql = `
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
    const eventUnit = contestData.event_unit_id || eventUnitId || 0;
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

/* POST /confirm-squad - Modificato per usare autenticazione JWT */
router.post("/confirm-squad", authenticateToken, (req, res) => {
  const { contestId, userId, players, multiplier, totalCost } = req.body;
  
  // Verifica che i dati necessari siano presenti
  if (!contestId || !userId || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: "Dati mancanti o invalidi" });
  }
  
  // Log per debug
  console.log("Dati ricevuti in confirm-squad:", JSON.stringify(req.body));
  console.log("Players ricevuti:", JSON.stringify(players));
  
  // Ottieni una connessione dal pool per la transazione
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Errore nella connessione al database:", err);
      return res.status(500).json({ error: "Errore di connessione al database" });
    }
    
    // Inizia la transazione
    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        console.error("Errore nell'iniziare la transazione:", err);
        return res.status(500).json({ error: "Errore nell'iniziare la transazione" });
      }
      
      try {
        // Calcola il costo totale della squadra
        let baseTeamCost = 0;
        players.forEach(p => {
          baseTeamCost += parseFloat(p.event_unit_cost || 0);
        });
        
        // Usa il moltiplicatore fornito o default a 1
        const effectiveMultiply = parseFloat(multiplier || 1);
        const multipliedCost = baseTeamCost * effectiveMultiply;
        
        // Verifica che l'utente abbia abbastanza teex
        const [userRows] = await connection.promise().query(
          "SELECT teex_balance FROM users WHERE user_id = ?",
          [userId]
        );
        
        if (userRows.length === 0) {
          return rollbackTransaction(connection, null, res, "Utente non trovato", 404);
        }
        
        const userBalance = parseFloat(userRows[0].teex_balance);
        if (userBalance < multipliedCost) {
          return rollbackTransaction(connection, null, res, "Saldo Teex insufficiente", 400);
        }
        
        // Ottieni informazioni sul contest
        const [contestRows] = await connection.promise().query(
          "SELECT status, owner_user_id, opponent_user_id, multiply FROM contests WHERE contest_id = ?",
          [contestId]
        );
        
        if (contestRows.length === 0) {
          return rollbackTransaction(connection, null, res, "Contest non trovato", 404);
        }
        
        const contest = contestRows[0];
        const isOwner = parseInt(userId) === parseInt(contest.owner_user_id);
        
        // Inserisci il nuovo team
        const [teamResult] = await connection.promise().query(
          "INSERT INTO fantasy_teams (user_id, contest_id, total_cost, updated_at) VALUES (?, ?, ?, NOW())",
          [userId, contestId, baseTeamCost]
        );
        
        const teamId = teamResult.insertId;
        
        // Inserisci tutti i giocatori, incluso aep_id
        const playerValues = players.map(p => [
          teamId, 
          p.athleteId || p.athlete_id, 
          p.event_unit_cost || 0,
          p.aep_id || null  // Aggiungi aep_id qui
        ]);
        
        if (playerValues.length > 0) {
          const placeholders = playerValues.map(() => "(?, ?, ?, ?)").join(", ");
          const flatValues = playerValues.flat();
          
          console.log("Inserimento giocatori con valori:", JSON.stringify(flatValues));
          
          await connection.promise().query(
            `INSERT INTO fantasy_team_entities (fantasy_team_id, athlete_id, cost, aep_id) VALUES ${placeholders}`,
            flatValues
          );
          
          // Aggiorna lo stato del contest e il valore multiply
          let updateFields = {};
          
          if (isOwner) {
            updateFields = {
              status: contest.status === 1 ? 2 : 1,
              multiply: effectiveMultiply,
              stake: baseTeamCost * effectiveMultiply
            };
          } else {
            updateFields = {
              status: contest.status === 1 ? 2 : 1
            };
            
            if (contest.status === 0) {
              updateFields.multiply = effectiveMultiply;
            }
            
            if (contest.status === 1) {
              const currentStake = parseFloat(contest.stake || 0);
              const additionalStake = baseTeamCost * effectiveMultiply;
              updateFields.stake = currentStake + additionalStake;
            }
          }
          
          console.log("Aggiornamento contest con campi:", JSON.stringify(updateFields));
          
          const updateSql = "UPDATE contests SET " + 
            Object.keys(updateFields).map(k => `${k} = ?`).join(", ") +
            ", updated_at = NOW() WHERE contest_id = ?";
          
          const updateParams = [...Object.values(updateFields), contestId];
          
          await connection.promise().query(updateSql, updateParams);
          
          // Sottrai il costo moltiplicato dal saldo dell'utente
          await connection.promise().query(
            "UPDATE users SET teex_balance = teex_balance - ? WHERE user_id = ?",
            [multipliedCost, userId]
          );
          
          // Commit della transazione
          connection.commit((err) => {
            if (err) {
              return rollbackTransaction(connection, err, res, "Errore nel commit della transazione");
            }
            
            connection.release();
            res.json({ 
              message: "Squadra confermata con successo",
              multiply: effectiveMultiply,
              baseTeamCost: baseTeamCost,
              multipliedCost: multipliedCost
            });
          });
        } else {
          return rollbackTransaction(connection, null, res, "Nessun giocatore fornito", 400);
        }
      } catch (error) {
        return rollbackTransaction(connection, error, res, "Errore nell'elaborazione della richiesta");
      }
    });
  });
});

module.exports = router;

// Aggiungi questa route per gestire le richieste a /contest-details
router.get("/", (req, res) => {
  const contestId = req.query.contest;
  const userId = req.query.user;
  
  if (!contestId) {
    return res.status(400).json({ error: "ID contest mancante" });
  }
  
  // Query per ottenere i dettagli del contest
  const sql = `
    SELECT c.contest_id, c.status, cs.status_name, c.stake,
           c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar, ow.color AS owner_color,
           c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar, op.color AS opponent_color,
           c.event_unit_id, c.multiply
    FROM contests c
    JOIN contests_status cs ON c.status = cs.status_id
    JOIN users ow ON c.owner_user_id = ow.user_id
    JOIN users op ON c.opponent_user_id = op.user_id
    WHERE c.contest_id = ?
  `;
  
  pool.query(sql, [contestId], (err, results) => {
    if (err) {
      console.error("Errore nella query contest:", err);
      return res.status(500).json({ error: "Errore nel database" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Contest non trovato" });
    }
    
    // Restituisci i dettagli del contest
    res.json(results[0]);
  });
});
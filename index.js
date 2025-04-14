const path = require('path');
const express = require("express");
const app = express();
const port = 3000;
const pool = require("./db");

app.use(express.json());
app.use(express.static("public"));
// Fallback su index.html se nessun'altra route viene trovata



const uploadResultsRoute = require("./uploadResults"); // Assicurati che il percorso sia corretto
app.use("/uploadResults", uploadResultsRoute);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server avviato su http://0.0.0.0:${port}`);
});

/* --------------------------- */
/* 1) GET /users */
/*****************************
 * GET /users
 * Restituisce l'elenco degli utenti attivi
 *****************************/
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
 * Crea un nuovo utente
 *****************************/
app.post("/users", (req, res) => {
  const { username, email, teex_balance, avatar, google_id } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: "Dati mancanti: 'username' ed 'email' sono obbligatori" });
  }
  
  const balance = teex_balance || 500;
  const isActive = 1;
  // Se avatar è presente, lo usiamo direttamente (sarà l'URL di Google)
  const finalAvatar = avatar || "";
  const finalGoogleId = google_id || "";
  
  const sql = `
    INSERT INTO users 
      (username, email, teex_balance, is_active, updated_at, avatar, google_id)
    VALUES 
      (?, ?, ?, ?, NOW(), ?, ?)
  `;
  const params = [username, email, balance, isActive, finalAvatar, finalGoogleId];
  
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


/* --------------------------- */
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
  const eId = req.query.event || 30;
  const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
           m.home_team, m.away_team,
           ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
           ht.team_name AS home_team_name, at.team_name AS away_team_name,
           t.team_3letter AS player_team_code, t.team_name AS player_team_name,
           m.match_id
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    JOIN teams t ON a.team_id = t.team_id
    LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
    LEFT JOIN teams ht ON m.home_team = ht.team_id
    LEFT JOIN teams at ON m.away_team = at.team_id
    WHERE aep.event_unit_id = ?
  `;
  pool.query(sql, [eId], (er, rows) => {
    if (er) {
      console.error("DB error /event-players", er);
      return res.status(500).json({ error: "DB error /event-players" });
    }
    res.json(rows);
  });
});

/* --------------------------- */
/* 4) GET /user-landing-info?user=XX */
/* Qui aggiungiamo la logica per aggiornare contest.status_display se esiste un risultato parziale */
app.get("/user-landing-info", (req, res) => {
  const userId = req.query.user;
  if (!userId) return res.status(400).json({ error: "Missing user param" });
  const sqlUser = "SELECT user_id, username, teex_balance, avatar FROM users WHERE user_id = ?";
  pool.query(sqlUser, [userId], (err, ur) => {
    if (err) return res.status(500).json({ error: "DB error user" });
    if (!ur.length) return res.status(404).json({ error: "User not found" });
    const userData = ur[0];

    const sqlC = `
      SELECT c.contest_id, c.status, cs.status_name, c.stake,
             c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar,
             ft_o.total_cost AS owner_cost,
             c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar,
             ft_p.total_cost AS opponent_cost,
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
      if (er2) return res.status(500).json({ error: "DB error contests" });
      
      // Per ogni contest, se lo status è 4 e almeno un atleta ha is_ended=1, computiamo il risultato parziale.
      let pending = contests.length;
      if (pending === 0) {
        return res.json({ user: userData, active: [], completed: [] });
      }
      contests.forEach((contest, idx) => {
        if (contest.status == 4) {
          // Eseguiamo la query per calcolare il risultato parziale
          const sqlTeam = `
            SELECT fte.*, a.athlete_shortname, a.picture, a.position, a.team_id, aep.is_ended,
                   COALESCE(ROUND(aep.athlete_unit_points, 1), 0) AS athlete_points,
                   m.home_team, m.away_team,
                   ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code
            FROM fantasy_team_entities fte
            JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
            JOIN athletes a ON fte.athlete_id = a.athlete_id
            LEFT JOIN athlete_eventunit_participation aep 
                   ON a.athlete_id = aep.athlete_id AND aep.event_unit_id = ?
            LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
            LEFT JOIN teams ht ON m.home_team = ht.team_id
            LEFT JOIN teams at ON m.away_team = at.team_id
            WHERE ft.contest_id = ? AND ft.user_id = ?
          `;
          pool.query(sqlTeam, [contest.event_unit_id || 30, contest.contest_id, contest.owner_id], (err2, owRows) => {
            if (err2) {
              console.error("Error in owner team query (user-landing):", err2);
              contest.status_display = contest.status_name;
              checkDone();
            } else {
              pool.query(sqlTeam, [contest.event_unit_id || 30, contest.contest_id, contest.opponent_id], (err3, oppRows) => {
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
           ft_o.total_cost AS owner_cost,
           c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar,
           ft_p.total_cost AS opponent_cost,
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

    const sqlTeam = `
      SELECT fte.*, a.athlete_shortname, a.picture, a.position, a.team_id, aep.is_ended,
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
    pool.query(sqlTeam, [contestData.event_unit_id || 30, cId, contestData.owner_id], (er2, owRows) => {
      if (er2) {
        console.error("Error in owner team query:", er2);
        return res.status(500).json({ error: "DB error owner team" });
      }
      pool.query(sqlTeam, [contestData.event_unit_id || 30, cId, contestData.opponent_id], (er3, oppRows) => {
        if (er3) {
          console.error("Error in opponent team query:", er3);
          return res.status(500).json({ error: "DB error opponent team" });
        }
        let partialEnded = false;
        owRows.forEach(r => { if (r.is_ended == 1) partialEnded = true; });
        oppRows.forEach(r => { if (r.is_ended == 1) partialEnded = true; });
        if (partialEnded) {
          let sumOwner = owRows.reduce((acc, r) => acc + parseFloat(r.athlete_points || 0), 0);
          let sumOpponent = oppRows.reduce((acc, r) => acc + parseFloat(r.athlete_points || 0), 0);
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
/* 6) POST /confirm-squad */
app.post("/confirm-squad", (req, res) => {
  // Explicitly extract multiply from request body with default value of 1
  const { contestId, userId, players, multiply = 1, totalCost } = req.body;
  
  console.log("Received multiply value:", multiply); // Add logging to debug
  
  if (!contestId || !userId || !players) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  
  // First, check if the user has enough balance
  pool.query("SELECT teex_balance FROM users WHERE user_id = ?", [userId], (err, userRows) => {
    if (err) {
      console.error("Error checking user balance:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userBalance = userRows[0].teex_balance;
    
    // Calculate the base team cost (without multiplication)
    const baseTeamCost = players.reduce((sum, p) => sum + parseFloat(p.event_unit_cost || 0), 0);
    
    // Get contest info to determine if user is owner or opponent
    pool.query("SELECT owner_user_id, opponent_user_id, status, multiply as contest_multiply, stake FROM contests WHERE contest_id = ?", 
      [contestId], (err, contestRows) => {
        if (err) {
          console.error("Error getting contest:", err);
          return res.status(500).json({ error: "Database error" });
        }
        
        if (!contestRows.length) {
          return res.status(404).json({ error: "Contest not found" });
        }
        
        const contest = contestRows[0];
        const isOwner = parseInt(userId) === parseInt(contest.owner_user_id);
        const isOpponent = parseInt(userId) === parseInt(contest.opponent_user_id);
        
        if (!isOwner && !isOpponent) {
          return res.status(403).json({ error: "User is not part of this contest" });
        }
        
        // IMPORTANT: If user is opponent and contest status is 1 (invited),
        // we must use the contest's multiply value, not the one from the request
        let effectiveMultiply = multiply;
        if (isOpponent && contest.status === 1 && contest.contest_multiply) {
          effectiveMultiply = contest.contest_multiply;
          console.log("Opponent in invited contest - using contest multiply:", effectiveMultiply);
        }
        
        // Calculate the multiplied cost (what the user actually pays)
        const multipliedCost = baseTeamCost * effectiveMultiply;
        
        if (multipliedCost > userBalance) {
          return res.status(400).json({ error: "Insufficient balance" });
        }
        
        // First, find any existing fantasy teams for this user and contest
        pool.query("SELECT fantasy_team_id FROM fantasy_teams WHERE user_id = ? AND contest_id = ?", 
          [userId, contestId], (err, teamRows) => {
            if (err) {
              console.error("Error checking existing team:", err);
              return res.status(500).json({ error: "Database error" });
            }
            
            // If team exists, delete its entities first
            if (teamRows.length > 0) {
              const teamId = teamRows[0].fantasy_team_id;
              
              // Delete the entities first to avoid foreign key constraint
              pool.query("DELETE FROM fantasy_team_entities WHERE fantasy_team_id = ?", 
                [teamId], (err) => {
                  if (err) {
                    console.error("Error deleting team entities:", err);
                    return res.status(500).json({ error: "Database error" });
                  }
                  
                  // Now delete the team
                  pool.query("DELETE FROM fantasy_teams WHERE fantasy_team_id = ?", 
                    [teamId], (err) => {
                      if (err) {
                        console.error("Error deleting team:", err);
                        return res.status(500).json({ error: "Database error" });
                      }
                      
                      // Continue with creating new team
                      createNewTeam();
                    });
                });
            } else {
              // No existing team, proceed with creation
              createNewTeam();
            }
            
            // Function to create a new team and add players
            function createNewTeam() {
              // Insert the new team with the base cost (NOT multiplied)
              pool.query("INSERT INTO fantasy_teams (user_id, contest_id, total_cost) VALUES (?, ?, ?)",
                [userId, contestId, baseTeamCost], (err, teamResult) => {
                  if (err) {
                    console.error("Error creating team:", err);
                    return res.status(500).json({ error: "Database error" });
                  }
                  
                  const teamId = teamResult.insertId;
                  
                  // Insert all players
                  const playerValues = players.map(p => [teamId, p.athlete_id, p.event_unit_cost || 0]);
                  
                  if (playerValues.length > 0) {
                    const placeholders = playerValues.map(() => "(?, ?, ?)").join(", ");
                    const flatValues = playerValues.flat();
                    
                    pool.query(`INSERT INTO fantasy_team_entities (fantasy_team_id, athlete_id, cost) VALUES ${placeholders}`,
                      flatValues, (err) => {
                        if (err) {
                          console.error("Error adding players:", err);
                          return res.status(500).json({ error: "Database error" });
                        }
                        
                        // Update contest status and multiply value
                        let updateFields = {};
                        
                        if (isOwner) {
                          // If owner confirms, set initial stake to baseTeamCost * multiply
                          updateFields = {
                            status: contest.status === 1 ? 2 : 1, // If opponent already confirmed, set to 2 (ready)
                            multiply: effectiveMultiply, // Always update multiply when owner confirms
                            stake: baseTeamCost * effectiveMultiply // Set initial stake to owner's multiplied cost
                          };
                        } else {
                          // If opponent confirms, add their multiplied cost to existing stake
                          updateFields = {
                            status: contest.status === 1 ? 2 : 1 // If owner already confirmed, set to 2 (ready)
                          };
                          
                          // Only update multiply if it's the first confirmation (status 0)
                          if (contest.status === 0) {
                            updateFields.multiply = effectiveMultiply;
                          }
                          
                          // If this is the second confirmation (status 1), add opponent's multiplied cost to stake
                          if (contest.status === 1) {
                            // Always use the contest's multiply value for consistency when opponent confirms
                            // Fix: Parse the values as floats and add them properly
                            const currentStake = parseFloat(contest.stake || 0);
                            const additionalStake = baseTeamCost * effectiveMultiply;
                            updateFields.stake = currentStake + additionalStake;
                            
                            console.log(`Stake calculation: ${currentStake} + (${baseTeamCost} * ${effectiveMultiply}) = ${updateFields.stake}`);
                          }
                        }
                        
                        console.log("Updating contest with fields:", updateFields); // Add logging
                        
                        const updateSql = "UPDATE contests SET " + 
                          Object.keys(updateFields).map(k => `${k} = ?`).join(", ") +
                          " WHERE contest_id = ?";
                        
                        const updateParams = [...Object.values(updateFields), contestId];
                        
                        pool.query(updateSql, updateParams, (err) => {
                          if (err) {
                            console.error("Error updating contest:", err);
                            return res.status(500).json({ error: "Database error" });
                          }
                          
                          // Deduct the multiplied cost from user's balance
                          pool.query("UPDATE users SET teex_balance = teex_balance - ? WHERE user_id = ?",
                            [multipliedCost, userId], (err) => {
                              if (err) {
                                console.error("Error updating balance:", err);
                                return res.status(500).json({ error: "Database error" });
                              }
                              
                              res.json({ 
                                message: "Squad confirmed successfully",
                                multiply: effectiveMultiply,
                                baseTeamCost: baseTeamCost,
                                multipliedCost: multipliedCost
                              });
                            });
                        });
                      });
                  } else {
                    res.status(400).json({ error: "No players provided" });
                  }
                });
            }
          });
      });
  });
});

// Endpoint per impostare i contest "live" (status 4)
app.get("/set-live-contests", (req, res) => {
  // La query aggiorna tutti i contest con status 2 che hanno almeno un fantasy_team_entity con is_ended = 1
  const updateQuery = `
      UPDATE contests c
      JOIN (
          SELECT DISTINCT ft.contest_id
          FROM fantasy_team_entities fte
          JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
          JOIN athlete_eventunit_participation aep ON fte.athlete_id = aep.athlete_id
          WHERE aep.event_unit_id = 30 AND aep.is_ended = 1
      ) AS sub ON c.contest_id = sub.contest_id
      SET c.status = 4, c.updated_at = NOW()
      WHERE c.status = 2;

  `;
  
  pool.query(updateQuery, (err, result) => {
    if (err) {
      console.error("Errore nell'aggiornamento dei contest live:", err);
      return res.status(500).json({ error: "DB error updating live contests" });
    }
    res.json({ message: "Live contests set successfully", affectedRows: result.affectedRows });
  });
});

// GET /user-by-email?email=...
app.get("/user-by-email", (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  const sql = "SELECT user_id, username, email FROM users WHERE email = ?";
  pool.query(sql, [email], (err, rows) => {
    if (err) {
      console.error("Error in GET /user-by-email:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(rows[0]);
  });
});


// GET /current-event-unit
app.get("/current-event-unit", (req, res) => {
  // Qui selezioniamo l'unità evento corrente: status = 3
  const sql = "SELECT event_unit_id FROM event_units WHERE status = 3 LIMIT 1";
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

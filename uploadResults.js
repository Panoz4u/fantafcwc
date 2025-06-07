const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pool = require('./services/db');
const { 
  setLiveLeagueContests, 
  updateLeagueContests, 
  closeLeagueContests 
} = require('./processLeagueResults');

// Configurazione di Multer per salvare i file nella cartella "uploads"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");  // assicurati che questa cartella esista
  },
  filename: function (req, file, cb) {
    // Salva il file con nome univoco (es. timestamp + nome originale)
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Route GET per mostrare il form di upload (opzionale)
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "uploadResults.html"));
});

// Route POST per gestire l'upload
router.post("/", upload.single("resultsFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Nessun file caricato.");
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let resultsData;
    if (ext === ".json") {
      // Se il file è JSON
      const data = fs.readFileSync(filePath, "utf8");
      resultsData = JSON.parse(data);
    } else if (ext === ".xls" || ext === ".xlsx") {
      // Se il file è Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Prendi il primo sheet
      const worksheet = workbook.Sheets[sheetName];
      resultsData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).send("Tipo di file non supportato. Carica un file JSON o Excel.");
    }

    // Processa i risultati e attendi che tutti gli aggiornamenti siano completati
    await processResults(resultsData);

    // Rispondi quando tutto è stato processato, i contest live e closed sono aggiornati
    res.send("File processato, live contests e closed contests aggiornati con successo.");
  } catch (err) {
    console.error("Errore nel processing del file:", err);
    res.status(500).send("Errore nel processing del file.");
  }
});

// Funzione asincrona per processare i dati letti dal file
async function processResults(data) {
  // Crea una promessa per ogni aggiornamento
  const promises = data.map(item => {
    return new Promise((resolve) => {
      const sql = `
        UPDATE athlete_eventunit_participation 
        SET athlete_unit_points = ?, is_ended = ? 
        WHERE athlete_id = ? AND event_unit_id = ?
      `;
      pool.query(sql, [item.athlete_unit_points, item.is_ended, item.athlete_id, item.event_unit_id], (err, result) => {
        if (err) {
          console.error("Errore aggiornamento per athlete_id:", item.athlete_id, err);
          resolve({ success: false, error: err });
        } else {
          console.log(`Record aggiornato per athlete_id ${item.athlete_id} e event_unit_id ${item.event_unit_id}`);
          resolve({ success: true });
        }
      });
    });
  });

  // Attendi che tutti gli update siano completati
  const results = await Promise.all(promises);
  
  // Estrai gli event_unit_id unici dai dati processati
  const eventUnitIds = [...new Set(data.map(item => item.event_unit_id))];
  console.log("Event unit IDs processati:", eventUnitIds);
  
  // Per ogni event_unit_id, aggiorna i contest
  for (const eventUnitId of eventUnitIds) {
       // Head to Head
       await setLiveContests(eventUnitId);
       await closeContests(eventUnitId);
       
       // League
          await setLiveLeagueContests(eventUnitId);
          await closeLeagueContests(eventUnitId);
          await updateLeagueContests(eventUnitId);
  }
}

// Funzione per aggiornare i contest live (status 2 -> 4)
function setLiveContests(eventUnitId) {
  return new Promise((resolve) => {
    console.log(`Verificando contest live per event_unit_id: ${eventUnitId}`);
    
        // Verifichiamo prima tutti i contest di tipo 1 associati a questo event_unit_id
        const allContestsQuery = `
          SELECT DISTINCT c.contest_id, c.status, c.owner_user_id, c.opponent_user_id
          FROM contests c
          JOIN fantasy_teams ft     ON c.contest_id = ft.contest_id
          JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
          JOIN athlete_eventunit_participation aep
            ON fte.aep_id = aep.aep_id
          WHERE aep.event_unit_id = ?
            AND c.contest_type = 1
        `;
         
    
    pool.query(allContestsQuery, [eventUnitId], (allErr, allResults) => {
      if (allErr) {
        console.error(`Errore nella verifica di tutti i contest per event_unit_id ${eventUnitId}:`, allErr);
      } else {
        console.log(`Tutti i contest associati a event_unit_id ${eventUnitId}:`, allResults);
      }
      
            // Ora verifichiamo quali contest di tipo 1 hanno almeno un atleta concluso
            const checkQuery = `
            SELECT
              ft.contest_id,
              c.status,
              SUM(CASE WHEN aep.is_ended = 1 THEN 1 ELSE 0 END) AS ended_athletes,
              COUNT(fte.aep_id) AS total_athletes
            FROM fantasy_team_entities fte
            JOIN fantasy_teams ft     ON fte.fantasy_team_id = ft.fantasy_team_id
            JOIN athlete_eventunit_participation aep
              ON fte.aep_id = aep.aep_id
            JOIN contests c
              ON ft.contest_id = c.contest_id
            WHERE aep.event_unit_id = ?
              AND c.contest_type = 1
            GROUP BY ft.contest_id, c.status
            `;
      
      
      pool.query(checkQuery, [eventUnitId], (checkErr, checkResults) => {
        if (checkErr) {
          console.error(`Errore nella verifica dei contest live per event_unit_id ${eventUnitId}:`, checkErr);
          resolve();
          return;
        }
        
        console.log(`Dettaglio atleti per contest (event_unit_id ${eventUnitId}):`, checkResults);
        
        // Ora procediamo con l'aggiornamento dei contest che hanno almeno un atleta con is_ended = 1
        // e sono in stato 2 (scheduled)
                const updateQuery = `
                  UPDATE contests 
                  SET status = 4, updated_at = NOW()
                  WHERE status = 2
                    AND contest_type = 1
                    AND contest_id IN (
                      SELECT DISTINCT ft.contest_id
                      FROM fantasy_team_entities fte
                      JOIN fantasy_teams ft     ON fte.fantasy_team_id = ft.fantasy_team_id
                      JOIN athlete_eventunit_participation aep
                        ON fte.aep_id = aep.aep_id
                      WHERE aep.event_unit_id = ? 
                        AND aep.is_ended = 1
                    )
                `;
        
        pool.query(updateQuery, [eventUnitId], (err, result) => {
          if (err) {
            console.error(`Errore nell'aggiornamento dei contest live per event_unit_id ${eventUnitId}:`, err);
          } else {
            console.log(`Live contests aggiornati per event_unit_id ${eventUnitId}. Righe interessate: ${result.affectedRows}`);
          }
          resolve();
        });
      });
    });
  });
}

// Funzione per chiudere i contest (SET CLOSE_CONTEST)
function closeContests(eventUnitId) {
  return new Promise((resolve) => {
    console.log(`Verificando contest da chiudere per event_unit_id: ${eventUnitId}`);
    
    // Verifichiamo lo stato di tutti gli atleti per ogni utente in ogni contest
        const debugQuery = `
          SELECT
            ft.contest_id,
            c.status,
            ft.user_id,
            COUNT(fte.aep_id) AS total_athletes,
            SUM(CASE WHEN aep.is_ended = 1 THEN 1 ELSE 0 END) AS ended_athletes,
            GROUP_CONCAT(CONCAT(fte.aep_id, ':', aep.is_ended)) AS athlete_details
          FROM fantasy_teams ft
          JOIN fantasy_team_entities fte
            ON ft.fantasy_team_id = fte.fantasy_team_id
          JOIN athlete_eventunit_participation aep
            ON fte.aep_id = aep.aep_id
          JOIN contests c
            ON ft.contest_id = c.contest_id
          WHERE c.status IN (2,4)
            AND c.contest_type = 1
          GROUP BY ft.contest_id, c.status, ft.user_id
          ORDER BY ft.contest_id, ft.user_id
        `;
    
    pool.query(debugQuery, [eventUnitId], (debugErr, debugResults) => {
      if (debugErr) {
        console.error(`Errore nel debug dei contest per event_unit_id ${eventUnitId}:`, debugErr);
        resolve();
        return;
      } else {
        console.log(`Debug dettagliato dei contest per event_unit_id ${eventUnitId}:`, debugResults);
        
        // Analizziamo i risultati per vedere quali contest dovrebbero essere chiusi
        const contestsToClose = [];
        const contestUsers = {};
        
        debugResults.forEach(row => {
          if (!contestUsers[row.contest_id]) {
            contestUsers[row.contest_id] = [];
          }
          
          // Explicitly convert to numbers using Number() instead of parseInt
          const total = Number(row.total_athletes);
          const ended = Number(row.ended_athletes);
          
          contestUsers[row.contest_id].push({
            user_id: row.user_id,
            total: total,
            ended: ended
          });
        });
        
        console.log("Analisi contest per chiusura:", contestUsers);
        
        // Add more detailed logging to debug the comparison
        for (const [contestId, users] of Object.entries(contestUsers)) {
          console.log(`Verifica contest ${contestId}:`, users);
          console.log(`Contest ${contestId} - Tipo di dati:`, 
            users.map(u => `user ${u.user_id}: total (${typeof u.total}: ${u.total}), ended (${typeof u.ended}: ${u.ended})`));
          
          // Verifichiamo se tutti gli utenti hanno atleti e se tutti gli atleti sono ended
          let shouldClose = true;
          
          // Verifichiamo che ci siano esattamente 2 utenti
          if (users.length !== 2) {
            console.log(`Contest ${contestId} - Non ha 2 utenti, ne ha ${users.length}`);
            shouldClose = false;
          } else {
            // Verifichiamo che ogni utente abbia atleti e che tutti siano ended
            for (const user of users) {
              if (user.total <= 0) {
                console.log(`Contest ${contestId} - User ${user.user_id} non ha atleti (total: ${user.total})`);
                shouldClose = false;
                break;
              }
              if (user.total !== user.ended) {
                console.log(`Contest ${contestId} - User ${user.user_id} non ha tutti gli atleti ended (total: ${user.total}, ended: ${user.ended})`);
                shouldClose = false;
                break;
              }
            }
          }
          
          if (shouldClose) {
            console.log(`Contest ${contestId} - Dovrebbe essere chiuso!`);
            contestsToClose.push(parseInt(contestId));
          } else {
            console.log(`Contest ${contestId} - Non dovrebbe essere chiuso.`);
          }
        }
        
        console.log(`Contest che dovrebbero essere chiusi: ${contestsToClose.join(', ')}`);
        
        // Se non ci sono contest da chiudere, terminiamo
        if (contestsToClose.length === 0) {
          console.log(`Nessun contest da chiudere per event_unit_id ${eventUnitId}.`);
          resolve();
          return;
        }
        
        // Altrimenti, procediamo con la chiusura dei contest
        let completedContests = 0;
        
        contestsToClose.forEach(contestId => {
          // Seleziona le informazioni del contest
          const selectContestQuery = `
            SELECT c.contest_id, c.owner_user_id, c.opponent_user_id, c.stake
            FROM contests c
            WHERE c.contest_id = ?
          `;
          
          pool.query(selectContestQuery, [contestId], (err, contests) => {
            if (err || contests.length === 0) {
              console.error(`Errore nella selezione del contest ${contestId}:`, err);
              if (++completedContests === contestsToClose.length) resolve();
              return;
            }
            
            const contest = contests[0];
            console.log(`Chiusura contest ${contestId} con stake ${contest.stake}`);
            
            // Per ciascun contest, calcola il totale dei punti per ogni fantasy team
            const pointsQuery = `
              SELECT ft.user_id, ft.fantasy_team_id,
                     SUM(COALESCE(aep.athlete_unit_points, 0)) AS total_points
              FROM fantasy_teams ft
              JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
            JOIN athlete_eventunit_participation aep ON fte.aep_id     = aep.aep_id
              WHERE ft.contest_id = ?
              GROUP BY ft.user_id, ft.fantasy_team_id
            `;
            
            pool.query(pointsQuery, [contestId], (err, results) => {
              if (err) {
                console.error(`Errore nel calcolo dei punti per contest ${contestId}:`, err);
                if (++completedContests === contestsToClose.length) resolve();
                return;
              }
              
              console.log(`Risultati punti per contest ${contestId}:`, results);
              
              // Supponiamo che ci siano 2 righe, una per l'owner e una per l'opponent
              let ownerPoints = 0, opponentPoints = 0;
              let ownerTeamId = null, opponentTeamId = null;
              
              results.forEach(r => {
                if (r.user_id == contest.owner_user_id) {
                  ownerPoints = parseFloat(r.total_points);
                  ownerTeamId = r.fantasy_team_id;
                  console.log(`OWNER query - contest_id: ${contestId}, user: ${r.user_id}, event_unit: ${eventUnitId}, points: ${ownerPoints}`);
                } else if (r.user_id == contest.opponent_user_id) {
                  opponentPoints = parseFloat(r.total_points);
                  opponentTeamId = r.fantasy_team_id;
                  console.log(`OPPONENT query - contest_id: ${contestId}, user: ${r.user_id}, event_unit: ${eventUnitId}, points: ${opponentPoints}`);
                }
              });

              // Determina il risultato
              let ownerResult, opponentResult;
              if (ownerPoints > opponentPoints) {
                ownerResult = 1; // vittoria
                opponentResult = -1; // sconfitta - CORRETTO DA 2 A -1
              } else if (ownerPoints < opponentPoints) {
                ownerResult = -1; // sconfitta - CORRETTO DA 2 A -1
                opponentResult = 1;
              } else {
                ownerResult = opponentResult = 0; // pareggio - CORRETTO DA 3 A 0
              }

              // Calcola l'importo dei Teex vinti
              const stake = parseFloat(contest.stake);
              
              // Ottieni il total_cost per owner e opponent
              const getCostQuery = `
                SELECT fantasy_team_id, total_cost 
                FROM fantasy_teams 
                WHERE fantasy_team_id IN (?, ?)
              `;
              
              pool.query(getCostQuery, [ownerTeamId, opponentTeamId], (costErr, costResults) => {
                if (costErr) {
                  console.error(`Errore nel recupero dei costi per i team ${ownerTeamId}, ${opponentTeamId}:`, costErr);
                  return;
                }
                
                let ownerCost = 0, opponentCost = 0;
                
                costResults.forEach(r => {
                  if (r.fantasy_team_id == ownerTeamId) {
                    ownerCost = parseFloat(r.total_cost);
                  } else if (r.fantasy_team_id == opponentTeamId) {
                    opponentCost = parseFloat(r.total_cost);
                  }
                });
                
                // Ottieni il multiply del contest
                const getMultiplyQuery = `
                  SELECT multiply FROM contests WHERE contest_id = ?
                `;
                
                pool.query(getMultiplyQuery, [contestId], (multiplyErr, multiplyResults) => {
                  if (multiplyErr) {
                    console.error(`Errore nel recupero del multiply per il contest ${contestId}:`, multiplyErr);
                    return;
                  }
                  
                  const multiply = parseFloat(multiplyResults[0]?.multiply || 1); // Default a 1 se non trovato
                  console.log(`Contest ${contestId} - multiply: ${multiply}`);
                  
                  // Calcola i teex vinti in base alle nuove regole
                  let ownerTeexWon, opponentTeexWon;
                  
                  if (ownerPoints > opponentPoints) {
                    // Owner ha vinto, riceve tutto lo stake
                    ownerTeexWon = stake;
                    opponentTeexWon = 0;
                  } else if (ownerPoints < opponentPoints) {
                    // Opponent ha vinto, riceve tutto lo stake
                    ownerTeexWon = 0;
                    opponentTeexWon = stake;
                  } else {
                    // Pareggio, entrambi ricevono metà dello stake
                    ownerTeexWon = stake / 2;
                    opponentTeexWon = stake / 2;
                  }
                  
                  console.log(`Contest ${contestId} - Owner teex won: ${ownerTeexWon}, Opponent teex won: ${opponentTeexWon}`);
                  
                  // Aggiorna i fantasy teams
                  const updateFTQuery = `
                    UPDATE fantasy_teams 
                    SET total_points = ?, ft_status = 5, ft_result = ?, ft_teex_won = ?, updated_at = NOW()
                    WHERE fantasy_team_id = ?
                  `;
                  
                  pool.query(updateFTQuery, [ownerPoints, ownerResult, ownerTeexWon, ownerTeamId], (err1) => {
                    if (err1) console.error(`Errore aggiornamento fantasy team owner (${ownerTeamId}):`, err1);
                  });
                  
                  pool.query(updateFTQuery, [opponentPoints, opponentResult, opponentTeexWon, opponentTeamId], (err2) => {
                    if (err2) console.error(`Errore aggiornamento fantasy team opponent (${opponentTeamId}):`, err2);
                  });
              
                  // Aggiorna lo status del contest a 5 (closed)
                  const updateContestQuery = `
                    UPDATE contests
                    SET status = 5, updated_at = NOW()
                    WHERE contest_id = ?
                  `;
              
                  const updateUserQuery = `
                    UPDATE users
                    SET teex_balance = teex_balance + ?
                    WHERE user_id = ?
                  `;
              
                  // Aggiunge i teex vinti al current user (per l'owner)
                  pool.query(updateUserQuery, [ownerTeexWon, contest.owner_user_id], (err) => {
                    if(err) console.error(`Errore aggiornamento teex balance owner (${contest.owner_user_id}):`, err);
                  });
              
                  // E aggiunge per l'avversario
                  pool.query(updateUserQuery, [opponentTeexWon, contest.opponent_user_id], (err) => {
                    if(err) console.error(`Errore aggiornamento teex balance opponent (${contest.opponent_user_id}):`, err);
                  });
              
                  pool.query(updateContestQuery, [contestId], (err3) => {
                    if (err3) console.error(`Errore nell'aggiornamento del contest ${contestId} a closed:`, err3);
                    else console.log(`Contest chiuso con successo, contest_id: ${contestId}`);
                    
                    if (++completedContests === contestsToClose.length) resolve();
                  });
                });
              });
            });
          });
        });
      }
    });
  });
}

module.exports = router;

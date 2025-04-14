const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pool = require("./db"); // Assicurati che il percorso sia corretto

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
  await Promise.all(promises);

  // Dopo aver processato tutti i dati, chiama la funzione per settare i contest live
  setLiveContests(() => {
    // Quando setLiveContests è terminata, chiama closeContests
    closeContests();
  });
}

// Funzione per aggiornare i contest live (status 2 -> 4)
function setLiveContests(callback) {
  const updateQuery = `
      UPDATE contests 
      SET status = 4, updated_at = NOW()
      WHERE status = 2
        AND contest_id IN (
          SELECT contest_id FROM (
            SELECT DISTINCT ft.contest_id
            FROM fantasy_team_entities fte
            JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
            JOIN athlete_eventunit_participation aep ON fte.athlete_id = aep.athlete_id
            WHERE aep.event_unit_id = 30 AND aep.is_ended = 1
          ) AS subquery
        )
  `;
  
  pool.query(updateQuery, (err, result) => {
    if (err) {
      console.error("Errore nell'aggiornamento dei contest live:", err);
    } else {
      console.log(`Live contests aggiornati. Righe interessate: ${result.affectedRows}`);
    }
    if(callback) callback();
  });
}

// Funzione per chiudere i contest (SET CLOSE_CONTEST)
// Questa funzione seleziona i contest in status 2 o 4 che hanno TUTTI i giocatori conclusi (is_ended = 1)
// e per ognuno calcola il totale dei punti, aggiorna i fantasy team e infine setta lo status del contest a 5
function closeContests() {
  // Seleziona contest in status 2 o 4 che possono essere chiusi
  const selectQuery = `
    SELECT c.contest_id, c.owner_user_id, c.opponent_user_id, c.stake
    FROM contests c
    WHERE c.status IN (2,4)
      AND c.contest_id IN (
        SELECT contest_id FROM (
          SELECT ft.contest_id, ft.user_id
          FROM fantasy_teams ft
          JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
          JOIN athlete_eventunit_participation aep ON fte.athlete_id = aep.athlete_id
          WHERE aep.event_unit_id = 30
          GROUP BY ft.contest_id, ft.user_id
          HAVING MIN(aep.is_ended) = 1
        ) AS subq
        GROUP BY contest_id
        HAVING COUNT(*) = 2
      )
  `;
  pool.query(selectQuery, (err, contests) => {
    if (err) {
      console.error("Errore nella selezione dei contest da chiudere:", err);
      return;
    }
    if (contests.length === 0) {
      console.log("Nessun contest da chiudere.");
      return;
    }

    contests.forEach(contest => {
      // Per ciascun contest, calcola il totale dei punti per ogni fantasy team
      const pointsQuery = `
        SELECT ft.user_id,
               SUM(COALESCE(aep.athlete_unit_points, 0)) AS total_points
        FROM fantasy_teams ft
        JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
        JOIN athlete_eventunit_participation aep ON fte.athlete_id = aep.athlete_id
        WHERE ft.contest_id = ? AND aep.event_unit_id = 30
        GROUP BY ft.user_id
      `;
      pool.query(pointsQuery, [contest.contest_id], (err, results) => {
        if (err) {
          console.error("Errore nel calcolo dei punti per contest:", contest.contest_id, err);
          return;
        }
        // Supponiamo che ci siano 2 righe, una per l'owner e una per l'opponent
        let ownerPoints = 0, opponentPoints = 0;
        results.forEach(r => {
          if (r.user_id == contest.owner_user_id) {
            ownerPoints = parseFloat(r.total_points);
          } else if (r.user_id == contest.opponent_user_id) {
            opponentPoints = parseFloat(r.total_points);
          }
        });

        // Determina il risultato
        let ownerResult, opponentResult;
        if (ownerPoints > opponentPoints) {
          ownerResult = 1; // vittoria
          opponentResult = 2; // sconfitta
        } else if (ownerPoints < opponentPoints) {
          ownerResult = 2;
          opponentResult = 1;
        } else {
          ownerResult = opponentResult = 3; // pareggio
        }

        // Calcola l'importo dei Teex vinti
        const stake = parseFloat(contest.stake);
        const ownerTeexWon = (ownerResult === 1) ? stake : (ownerResult === 3 ? stake / 2 : 0);
        const opponentTeexWon = (opponentResult === 1) ? stake : (opponentResult === 3 ? stake / 2 : 0);

        // Aggiorna i fantasy teams (campi total_points, ft_status, ft_result, ft_teex_won)
        const updateFTQuery = `
        UPDATE fantasy_teams 
        SET total_points = ?, ft_status = 5, ft_result = ?, ft_teex_won = ?, updated_at = NOW()
        WHERE contest_id = ? AND user_id = ?
      `;
        pool.query(updateFTQuery, [ownerPoints, ownerResult, ownerTeexWon, contest.contest_id, contest.owner_user_id], (err1) => {
          if (err1) console.error("Errore aggiornamento fantasy team owner:", err1);
        });
        pool.query(updateFTQuery, [opponentPoints, opponentResult, opponentTeexWon, contest.contest_id, contest.opponent_user_id], (err2) => {
          if (err2) console.error("Errore aggiornamento fantasy team opponent:", err2);
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
        // Aggiunge i teex vinti al current user (per l’owner)
        pool.query(updateUserQuery, [ownerTeexWon, contest.owner_user_id], (err) => {
        if(err) console.error("Errore aggiornamento teex balance owner:", err);
        });
        // E aggiunge per l’avversario
        pool.query(updateUserQuery, [opponentTeexWon, contest.opponent_user_id], (err) => {
        if(err) console.error("Errore aggiornamento teex balance opponent:", err);
        });



        pool.query(updateContestQuery, [contest.contest_id], (err3) => {
          if (err3) console.error("Errore nell'aggiornamento del contest a closed:", err3);
          else console.log("Contest chiuso con successo, contest_id:", contest.contest_id);
        });
      });
    });
  });
}

module.exports = router;

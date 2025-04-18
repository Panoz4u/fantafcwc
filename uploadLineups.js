const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pool = require("./db");

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

// Route GET per mostrare il form di upload
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "uploadLineups.html"));
});

// Route POST per gestire l'upload
router.post("/", upload.single("lineupsFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Nessun file caricato.");
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let lineupsData;
    if (ext === ".json") {
      // Se il file è JSON
      const data = fs.readFileSync(filePath, "utf8");
      lineupsData = JSON.parse(data);
    } else if (ext === ".xls" || ext === ".xlsx") {
      // Se il file è Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Prendi il primo sheet
      const worksheet = workbook.Sheets[sheetName];
      lineupsData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).send("Tipo di file non supportato. Carica un file JSON o Excel.");
    }

    // Processa i dati dei lineup e attendi che tutti gli aggiornamenti siano completati
    const results = await processLineups(lineupsData);
    
    // Prepara un riepilogo dei risultati
    const summary = {
      total: results.length,
      inserted: results.filter(r => r.action === 'insert' && r.success).length,
      updated: results.filter(r => r.action === 'update' && r.success).length,
      failed: results.filter(r => !r.success).length
    };

    // Rispondi con un riepilogo
    res.send(`File processato con successo. Totale record: ${summary.total}, Inseriti: ${summary.inserted}, Aggiornati: ${summary.updated}, Falliti: ${summary.failed}`);
  } catch (err) {
    console.error("Errore nel processing del file:", err);
    res.status(500).send("Errore nel processing del file: " + err.message);
  }
});

// Funzione asincrona per processare i dati letti dal file
async function processLineups(data) {
  const results = [];
  
  // Processa ogni riga del file
  for (const item of data) {
    try {
      // Verifica se esiste già un record con questa combinazione athlete_id/event_unit_id
      const checkResult = await checkExistingRecord(item.athlete_id, item.event_unit_id);
      
      if (checkResult.exists) {
        // Se esiste, aggiorna il record
        const updateResult = await updateRecord(item);
        results.push({
          athlete_id: item.athlete_id,
          event_unit_id: item.event_unit_id,
          action: 'update',
          success: updateResult.success,
          error: updateResult.error
        });
      } else {
        // Se non esiste, inserisci un nuovo record
        const insertResult = await insertRecord(item);
        results.push({
          athlete_id: item.athlete_id,
          event_unit_id: item.event_unit_id,
          action: 'insert',
          success: insertResult.success,
          error: insertResult.error
        });
      }
    } catch (error) {
      console.error(`Errore nel processare il record (athlete_id: ${item.athlete_id}, event_unit_id: ${item.event_unit_id}):`, error);
      results.push({
        athlete_id: item.athlete_id,
        event_unit_id: item.event_unit_id,
        action: 'unknown',
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Funzione per verificare se esiste già un record
function checkExistingRecord(athleteId, eventUnitId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) as count 
      FROM athlete_eventunit_participation 
      WHERE athlete_id = ? AND event_unit_id = ?
    `;
    
    pool.query(sql, [athleteId, eventUnitId], (err, result) => {
      if (err) {
        console.error("Errore nella verifica del record esistente:", err);
        reject(err);
      } else {
        resolve({ exists: result[0].count > 0 });
      }
    });
  });
}

// Funzione per aggiornare un record esistente
function updateRecord(item) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE athlete_eventunit_participation 
      SET 
        event_unit_cost = ?,
        status = ?,
        updated_at = NOW(),
        athlete_unit_points = ?,
        is_ended = ?
      WHERE athlete_id = ? AND event_unit_id = ?
    `;
    
    pool.query(sql, [
      item.event_unit_cost,
      item.status,
      item.athlete_unit_points,
      item.is_ended,
      item.athlete_id,
      item.event_unit_id
    ], (err, result) => {
      if (err) {
        console.error("Errore nell'aggiornamento del record:", err);
        resolve({ success: false, error: err.message });
      } else {
        console.log(`Record aggiornato per athlete_id ${item.athlete_id} e event_unit_id ${item.event_unit_id}`);
        resolve({ success: true });
      }
    });
  });
}

// Funzione per inserire un nuovo record
function insertRecord(item) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO athlete_eventunit_participation 
      (athlete_id, event_unit_id, event_unit_cost, status, created_at, updated_at, athlete_unit_points, is_ended)
      VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)
    `;
    
    pool.query(sql, [
      item.athlete_id,
      item.event_unit_id,
      item.event_unit_cost,
      item.status,
      item.athlete_unit_points || null,
      item.is_ended || 0
    ], (err, result) => {
      if (err) {
        console.error("Errore nell'inserimento del nuovo record:", err);
        resolve({ success: false, error: err.message });
      } else {
        console.log(`Nuovo record inserito per athlete_id ${item.athlete_id} e event_unit_id ${item.event_unit_id}`);
        resolve({ success: true });
      }
    });
  });
}

module.exports = router;
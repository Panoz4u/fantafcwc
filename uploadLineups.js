const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pool = require('./services/db');
const moment = require('moment-timezone');
const ALLOWED_COLUMNS = [
  'athlete_id',
  'event_unit_id',
  'event_unit_cost',
  'status',
  'athlete_unit_points',
  'is_ended',
  'created_at',
  'updated_at',
  'valid_from',
  'valid_to'
];
// colonne che vanno parse-date
const DATE_COLUMNS = ['created_at','updated_at','valid_from','valid_to'];

// Helper per normalizzare chiavi e parsare date da Excel
// Helper per normalizzare chiavi e parsare date da Excel
// dopo ALLOWED_COLUMNS e DATE_COLUMNS...
function normalizeItem(raw) {
  const item = {};

  function excelDateToJSDate(serial) {
    const utcDays = Math.floor(serial - 25569);
    const utcMs   = utcDays * 86400 * 1000;
    const fracDay = serial - Math.floor(serial);
    const msFrac  = Math.round(86400 * 1000 * fracDay);
    return new Date(utcMs + msFrac);
  }

  Object.entries(raw).forEach(([origKey, val]) => {
    const key = origKey.trim().toLowerCase().replace(/[\s\-]+/g,'_');
    if (!ALLOWED_COLUMNS.includes(key) || val == null || val === '') return;

    if (DATE_COLUMNS.includes(key)) {
      let m;
      if (val instanceof Date) {
        // già JS Date → assumilo in Europe/Rome
        m = moment(val).tz('Europe/Rome');
      } else if (typeof val === 'number') {
        // serial Excel
        m = moment(excelDateToJSDate(val)).tz('Europe/Rome');
      } else {
        // stringa "DD/MM/YYYY HH:mm"
        m = moment.tz(val, 'DD/MM/YYYY HH:mm', 'Europe/Rome');
      }
      // salva in UTC
      item[key] = m.utc().format('YYYY-MM-DD HH:mm:ss');
    } else {
      item[key] = val;
    }
  });

  return item;
}


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
  for (let raw of data) {
    const item = normalizeItem(raw);    // <-- qui la nuova normalizzazione

    try {
      const checkResult = await checkExistingRecord(item.athlete_id, item.event_unit_id);
      if (checkResult.exists) {
        const updateResult = await updateRecord(item);
        results.push({ athlete_id:item.athlete_id, event_unit_id:item.event_unit_id, action:'update', success:updateResult.success, error:updateResult.error });
      } else {
        const insertResult = await insertRecord(item);
        results.push({ athlete_id:item.athlete_id, event_unit_id:item.event_unit_id, action:'insert', success:insertResult.success, error:insertResult.error });
      }
    } catch (error) {
      results.push({ athlete_id:item.athlete_id, event_unit_id:item.event_unit_id, action:'unknown', success:false, error:error.message });
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
  return new Promise((resolve) => {
    // 1. Costruisci dinamicamente campo = ? per ogni proprietà valida
    const sets = [];
    const values = [];

    Object.entries(item).forEach(([key, val]) => {
      if (['athlete_id', 'event_unit_id'].includes(key)) return;
      if (!ALLOWED_COLUMNS.includes(key)) return;
      sets.push(`\`${key}\` = ?`);
      values.push(val);
    });

    // 2. Assicuriamoci di aggiornare sempre updated_at
    sets.push('`updated_at` = NOW()');

    // 3. Monta la query
    const sql = `
      UPDATE athlete_eventunit_participation
      SET ${sets.join(', ')}
      WHERE athlete_id = ? AND event_unit_id = ?
    `;
    values.push(item.athlete_id, item.event_unit_id);

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Errore nell'aggiornamento del record:", err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}


function insertRecord(item) {
  return new Promise((resolve) => {
    const cols = ['athlete_id', 'event_unit_id'];
    const placeholders = ['?', '?'];
    const values = [item.athlete_id, item.event_unit_id];

    // Aggiungi tutte le proprietà valide (escluse chiavi PK)
    Object.entries(item).forEach(([key, val]) => {
      if (['athlete_id', 'event_unit_id'].includes(key)) return;
      if (!ALLOWED_COLUMNS.includes(key)) return;
      cols.push(`\`${key}\``);
      placeholders.push('?');
      values.push(val);
    });

    // Se il file non contiene created_at, lo mettiamo noi
    if (!cols.includes('`created_at`')) {
      cols.push('`created_at`');
      placeholders.push('NOW()');
    }

    // Stesso per updated_at
    if (!cols.includes('`updated_at`')) {
      cols.push('`updated_at`');
      placeholders.push('NOW()');
    }

    const sql = `
      INSERT INTO athlete_eventunit_participation
      (${cols.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Errore nell'inserimento del record:", err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}


module.exports = router;
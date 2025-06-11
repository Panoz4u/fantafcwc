// uploadLineups.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const XLSX    = require("xlsx");
const pool    = require("./services/db");
const moment  = require("moment-timezone");

// Colonne ammesse (senza created_at/updated_at, gestite in DB)
const ALLOWED = [
  "athlete_id",
  "event_unit_id",
  "team_id",
  "event_unit_cost",
  "status",
  "athlete_unit_points",
  "is_ended",
  "valid_from",
  "valid_to"
];

// Colonne da trattare come date
const DATE_COLS = ["valid_from","valid_to"];

// Normalizza chiavi e converte date Excel→UTC string
function normalize(raw) {
  const out = {};

  // helper per serial Excel
  const excelDate = serial => {
    const d = new Date(Math.round((serial - 25569)*86400*1000));
    return d;
  };

  Object.entries(raw).forEach(([k,v]) => {
    const key = k.trim().toLowerCase().replace(/[\s\-]+/g,"_");
    if (!ALLOWED.includes(key)) return;      // scarta colonne non ammesse
    if (v === "") return;                    // lascia passare null, scarta solo stringa vuota

    if (DATE_COLS.includes(key)) {
      let m;
      if (typeof v === "number") {
        m = moment(excelDate(v));
      } else {
        m = moment.tz(v, "DD/MM/YYYY HH:mm", "Europe/Rome");
      }
      out[key] = m.utc().format("YYYY-MM-DD HH:mm:ss");
    } else {
      out[key] = v;
    }
  });

  return out;
}

// Multer: salva in /uploads
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, "uploads/"),
  filename:    (req,file,cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// GET → serve la pagina statica
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "uploadLineups.html"));
});

// POST → legge JSON/XLSX, normalizza e fa upsert su athlete_eventunit_participation
router.post("/", upload.single("lineupsFile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nessun file caricato.");

  // leggi dati
  let data;
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === ".json") {
      data = JSON.parse(fs.readFileSync(req.file.path, "utf8"));
    } else {
      const wb = XLSX.readFile(req.file.path);
      data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
    }
  } catch (e) {
    return res.status(500).send("Errore parsing file: " + e.message);
  }

  // processa tutte le righe
  const results = [];
  for (let raw of data) {
    const item = normalize(raw);
    if (!item.athlete_id || !item.event_unit_id) {
      results.push({ action: "skip", success: false });
      continue;
    }
    try {
      // esiste già?
      const [[{count}]] = await pool.promise()
        .query(
          "SELECT COUNT(*) AS count FROM athlete_eventunit_participation WHERE athlete_id=? AND event_unit_id=?",
          [item.athlete_id, item.event_unit_id]
        );

      if (count) {
        // UPDATE dinamico
        const sets = [], vals = [];
        Object.entries(item).forEach(([k,v]) => {
          if (k==="athlete_id"||k==="event_unit_id") return;
          sets.push(`\`${k}\`=?`);
          vals.push(v);
        });
        sets.push("`updated_at`=CURRENT_TIMESTAMP");
        vals.push(item.athlete_id, item.event_unit_id);

        await pool.promise().query(
          `UPDATE athlete_eventunit_participation SET ${sets.join(", ")}
           WHERE athlete_id=? AND event_unit_id=?`,
          vals
        );
        results.push({ action: "update", success: true });
      } else {
        // INSERT dinamico
        const cols = ["`athlete_id`","`event_unit_id`"];
        const phs  = ["?","?"];
        const vals = [item.athlete_id, item.event_unit_id];

        Object.entries(item).forEach(([k,v]) => {
          if (k==="athlete_id"||k==="event_unit_id") return;
          cols.push(`\`${k}\``);
          phs.push("?");
          vals.push(v);
        });

        await pool.promise().query(
          `INSERT INTO athlete_eventunit_participation (${cols.join(",")})
           VALUES (${phs.join(",")})`,
          vals
        );
        results.push({ action: "insert", success: true });
      }
    } catch (err) {
      console.error("Lineup error:", err);
      results.push({ action: "error", success: false, error: err.message });
    }
  }

  // rimuovi file
  fs.unlink(req.file.path, () => {});

  const summary = {
    total:    results.length,
    inserted: results.filter(r=>r.action==="insert" ).length,
    updated:  results.filter(r=>r.action==="update" ).length,
    failed:   results.filter(r=>!r.success   ).length
  };

  // risposta HTML
  res.send(`
<!DOCTYPE html><html lang="it"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Risultato Upload Lineup</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,800&family=Barlow+Condensed:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Montserrat',sans-serif;background:#f5f7fa;color:#333;padding:20px}
  .container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);padding:24px}
  h1{margin-bottom:16px;color:#2c3e50}
  .info p{margin:.5rem 0;font-weight:500}
  a{display:inline-block;margin-top:20px;color:#007bff;text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head><body>
  <div class="container">
    <h1>Upload Lineup – Risultato</h1>
    <div class="info">
      <p>Totale: ${summary.total}</p>
      <p>🆕 Inseriti: ${summary.inserted}</p>
      <p>🔄 Aggiornati: ${summary.updated}</p>
      <p>❌ Falliti: ${summary.failed}</p>
    </div>
    <a href="/uploadLineups">← Torna a Upload Lineup</a>
  </div>
</body></html>
  `);
});

module.exports = router;

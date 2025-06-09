// uploadTeams.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const XLSX    = require("xlsx");
const pool    = require("./services/db");

// Solo queste colonne – niente created_at/updated_at
const ALLOWED_COLUMNS = [
  "team_id",
  "team_name",
  "team_3letter",
  "team_logo",
  "team_kit"
];

function normalizeItem(raw) {
  const item = {};
  Object.entries(raw).forEach(([origKey, val]) => {
    const key = origKey.trim().toLowerCase().replace(/[\s\-]+/g, "_");
    if (!ALLOWED_COLUMNS.includes(key) || val == null || val === "") return;
    item[key] = val;
  });
  return item;
}

// Multer temporaneo in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// GET: serve il form
router.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "uploadTeams.html"))
);

// POST: legge il file, fa upsert solo sui campi esistenti
router.post("/", upload.single("teamsFile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nessun file caricato.");

  const filePath = req.file.path;
  const ext      = path.extname(req.file.originalname).toLowerCase();

  try {
    // Parsifica Excel o JSON
    let data;
    if (ext === ".json") {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } else {
      const wb = XLSX.readFile(filePath);
      const sh = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sh, { defval: null });
    }

    const results = [];
    for (let raw of data) {
      const item = normalizeItem(raw);

      // Se ho un team_id valido provo l’UPDATE, altrimenti INSERT
      if (item.team_id) {
        // controllo esistenza
        const [rows] = await pool
          .promise()
          .query("SELECT 1 FROM teams WHERE team_id = ? LIMIT 1", [item.team_id]);

        if (rows.length) {
          // UPDATE dinamico
          const sets = [];
          const vals = [];
          Object.entries(item).forEach(([k, v]) => {
            if (k === "team_id") return;
            sets.push(`\`${k}\` = ?`);
            vals.push(v);
          });
          vals.push(item.team_id);

          await pool
            .promise()
            .query(`UPDATE teams SET ${sets.join(", ")} WHERE team_id = ?`, vals);

          results.push({ action: "update", success: true });
          continue;
        }
      }

      // INSERT (team_id nullo o non esistente → auto_increment)
      const cols = [];
      const phs  = [];
      const vals = [];
      Object.entries(item).forEach(([k, v]) => {
        if (k === "team_id" && !v) return; // salta team_id null
        cols.push(`\`${k}\``);
        phs.push("?");
        vals.push(v);
      });

      await pool
        .promise()
        .query(
          `INSERT INTO teams (${cols.join(",")}) VALUES (${phs.join(",")})`,
          vals
        );

      results.push({ action: "insert", success: true });
    }

    // Riepilogo
    const summary = {
      total:    results.length,
      inserted: results.filter(r => r.action === "insert" ).length,
      updated:  results.filter(r => r.action === "update" ).length,
      failed:   results.filter(r => !r.success  ).length
    };

    // Pulisce il file temporaneo
    fs.unlink(filePath, () => {});

    // Risposta HTML
    res.send(`
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Risultato Upload Squadre</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;800&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Montserrat',sans-serif;background:#f5f7fa;color:#333;padding:20px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);padding:24px}
    h1{margin-bottom:16px;color:#2c3e50}
    p{margin:.5rem 0;font-weight:500}
    a{display:inline-block;margin-top:20px;color:#007bff;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="container">
    <h1>Upload Squadre – Risultato</h1>
    <p>Totale record: ${summary.total}</p>
    <p>🆕 Inseriti: ${summary.inserted}</p>
    <p>🔄 Aggiornati: ${summary.updated}</p>
    <p>❌ Falliti: ${summary.failed}</p>
    <a href="/uploadTeams">← Torna a Upload Squadre</a>
  </div>
</body>
</html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send("Errore interno: " + err.message);
  }
});

module.exports = router;

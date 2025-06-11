// uploadMatches.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const XLSX    = require("xlsx");
const pool    = require("./services/db");

// Campi ammessi (i campi created_at/updated_at li gestisce il DB automaticamente)
const ALLOWED = [
  "match_id",
  "event_unit_id",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "status",
  "match_date"
];

function normalize(raw) {
  const out = {};
  Object.entries(raw).forEach(([k, v]) => {
    const key = k.trim().toLowerCase().replace(/[\s\-]+/g, "_");
    if (!ALLOWED.includes(key) || v == null || v === "") return;
    out[key] = v;
  });
  return out;
}

// Multer: salva temporaneamente in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// GET → serve la form
router.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "uploadMatches.html"))
);

// POST → processa file ed esegue upsert
router.post("/", upload.single("matchesFile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nessun file caricato.");

  // Carica dati
  const ext = path.extname(req.file.originalname).toLowerCase();
  let data;
  try {
    if (ext === ".json") {
      data = JSON.parse(fs.readFileSync(req.file.path, "utf8"));
    } else {
      const wb = XLSX.readFile(req.file.path);
      const sh = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sh, { defval: null });
    }
  } catch (err) {
    return res.status(500).send("Errore nel parsing del file.");
  }

  const results = [];
  for (let raw of data) {
    const item = normalize(raw);

    // Se manca match_id → INSERT auto‐increment
    if (!item.match_id) {
      const cols = Object.keys(item).map(k => `\`${k}\``);
      const phs  = cols.map(_ => "?");
      const vals = Object.values(item);
      try {
        await new Promise((ok, ko) =>
          pool.query(
            `INSERT INTO matches (${cols.join(",")}) VALUES (${phs.join(",")})`,
            vals,
            err => (err ? ko(err) : ok())
          )
        );
        results.push({ action: "insert", success: true });
      } catch {
        results.push({ action: "insert", success: false });
      }

    // Altrimenti upsert su match_id
    } else {
      const exists = await new Promise((ok, ko) =>
        pool.query(
          "SELECT 1 FROM matches WHERE match_id = ? LIMIT 1",
          [item.match_id],
          (e, r) => (e ? ko(e) : ok(r.length > 0))
        )
      );

      if (exists) {
        const sets = [], vals = [];
        Object.entries(item).forEach(([k, v]) => {
          if (k === "match_id") return;
          sets.push(`\`${k}\` = ?`);
          vals.push(v);
        });
        vals.push(item.match_id);
        try {
          await new Promise((ok, ko) =>
            pool.query(
              `UPDATE matches SET ${sets.join(", ")} WHERE match_id = ?`,
              vals,
              err => (err ? ko(err) : ok())
            )
          );
          results.push({ action: "update", success: true });
        } catch {
          results.push({ action: "update", success: false });
        }
      } else {
        // INSERT con PK esplicito
        const cols = ["`match_id`"], phs = ["?"], vals = [item.match_id];
        Object.entries(item).forEach(([k, v]) => {
          if (k === "match_id") return;
          cols.push(`\`${k}\``);
          phs.push("?");
          vals.push(v);
        });
        try {
          await new Promise((ok, ko) =>
            pool.query(
              `INSERT INTO matches (${cols.join(",")}) VALUES (${phs.join(",")})`,
              vals,
              err => (err ? ko(err) : ok())
            )
          );
          results.push({ action: "insert", success: true });
        } catch {
          results.push({ action: "insert", success: false });
        }
      }
    }
  }

  // Riepilogo
  const total    = results.length;
  const inserted = results.filter(r => r.action === "insert" && r.success).length;
  const updated  = results.filter(r => r.action === "update" && r.success).length;
  const failed   = results.filter(r => !r.success).length;
  fs.unlink(req.file.path, () => {});

  // Risposta HTML in stile
  res.send(`
<!DOCTYPE html><html lang="it"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Risultato Upload Partite</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,800&family=Barlow+Condensed:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Montserrat',sans-serif;background-color:#260E3D;background-image:url('images/GradientBG.png');background-size:cover;background-position:center top;background-attachment:fixed;color:#fff;padding:20px}
  .container{max-width:800px;margin:0 auto;padding:20px}
  header{text-align:center;margin-bottom:40px;padding:20px;background-color:rgba(10,0,52,0.7);border-radius:10px}
  h1{font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:700;text-transform:uppercase;margin-bottom:10px}
  .info{background-color:rgba(10,0,52,0.7);border-left:6px solid #5DFDCB;padding:15px;margin-bottom:20px;border-radius:0 10px 10px 0;box-shadow:0 4px 8px rgba(0,0,0,0.3)}
  .info p{margin:8px 0;line-height:1.5;opacity:0.9}
  .back-link{display:inline-block;margin-top:20px;font-family:'Barlow Condensed',sans-serif;font-size:18px;color:#5DFDCB;text-decoration:none;transition:color .3s}
  .back-link:hover{text-decoration:underline;color:#7dffd5}
</style>
</head><body>
  <div class="container">
    <header><h1>Upload Partite – Risultato</h1></header>
    <div class="info">
      <p>Totale record processati: ${total}</p>
      <p>🆕 Inseriti: ${inserted}</p>
      <p>🔄 Aggiornati: ${updated}</p>
      <p>❌ Falliti: ${failed}</p>
    </div>
    <a href="/uploadMatches" class="back-link">← Torna a Upload Partite</a>
  </div>
</body></html>
  `);
});

module.exports = router;

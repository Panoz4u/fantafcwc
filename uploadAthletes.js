// uploadAthletes.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const XLSX    = require("xlsx");
const pool    = require("./services/db");

// Campi ammessi come in uploadMatches.js :contentReference[oaicite:2]{index=2}
const ALLOWED = [
  "athlete_id",
  "athlete_name",
  "position",
  "team_id",
  "picture",
  "athlete_shortname",
  "id_ext01"
];

// Normalizza chiavi (rimuove spazi, minuscolo) e filtra
function normalize(raw) {
  const out = {};
  Object.entries(raw).forEach(([k,v]) => {
    const key = k.trim().toLowerCase().replace(/[\s\-]+/g, "_");
    if (!ALLOWED.includes(key) || v == null || v === "") return;
    out[key] = v;
  });
  return out;
}

// Multer salva in /uploads
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null,"uploads/"),
  filename:    (req,file,cb) => cb(null,Date.now()+"_"+file.originalname)
});
const upload = multer({ storage });

// GET → serve uploadAthletes.html
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "uploadAthletes.html"));
});

// POST → processa file, upsert su athletes
router.post("/", upload.single("athletesFile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nessun file caricato.");
  const ext = path.extname(req.file.originalname).toLowerCase();
  let data;

  try {
    if (ext === ".json") {
      data = JSON.parse(fs.readFileSync(req.file.path, "utf8"));
    } else {
      const wb = XLSX.readFile(req.file.path);
      data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
    }
  } catch (err) {
    return res.status(500).send("Errore nel parsing del file.");
  }

  const results = [];
  for (let raw of data) {
    const item = normalize(raw);

    if (!item.athlete_id) {
      // INSERT senza PK → AUTO_INCREMENT
      const cols = Object.keys(item).map(k => `\`${k}\``);
      const phs  = cols.map(_=>"?");
      const vals = Object.values(item);
      try {
        await new Promise((ok,ko)=>
          pool.query(
            `INSERT INTO athletes (${cols.join(",")}) VALUES (${phs.join(",")})`,
            vals, err => err ? ko(err) : ok()
          )
        );
        results.push({ action:"insert", success:true });
      } catch {
        results.push({ action:"insert", success:false });
      }

    } else {
      // controlla esistenza
      const exists = await new Promise((ok,ko)=>
        pool.query(
          "SELECT 1 FROM athletes WHERE athlete_id = ? LIMIT 1",
          [item.athlete_id],
          (e,r) => e ? ko(e) : ok(r.length>0)
        )
      );
      if (exists) {
        // UPDATE dinamico
        const sets = [], vals = [];
        Object.entries(item).forEach(([k,v])=>{
          if (k==="athlete_id") return;
          sets.push(`\`${k}\` = ?`);
          vals.push(v);
        });
        vals.push(item.athlete_id);
        try {
          await new Promise((ok,ko)=>
            pool.query(
              `UPDATE athletes SET ${sets.join(", ")} WHERE athlete_id = ?`,
              vals, err => err ? ko(err) : ok()
            )
          );
          results.push({ action:"update", success:true });
        } catch {
          results.push({ action:"update", success:false });
        }
      } else {
        // INSERT con PK esplicito
        const cols = ["`athlete_id`"], phs = ["?"], vals = [item.athlete_id];
        Object.entries(item).forEach(([k,v])=>{
          if (k==="athlete_id") return;
          cols.push(`\`${k}\``);
          phs.push("?");
          vals.push(v);
        });
        try {
          await new Promise((ok,ko)=>
            pool.query(
              `INSERT INTO athletes (${cols.join(",")}) VALUES (${phs.join(",")})`,
              vals, err => err ? ko(err) : ok()
            )
          );
          results.push({ action:"insert", success:true });
        } catch {
          results.push({ action:"insert", success:false });
        }
      }
    }
  }

  // Riepilogo come in uploadMatches.js :contentReference[oaicite:3]{index=3}
  const total    = results.length;
  const inserted = results.filter(r=>r.action==="insert" && r.success).length;
  const updated  = results.filter(r=>r.action==="update" && r.success).length;
  const failed   = results.filter(r=>!r.success).length;
  fs.unlink(req.file.path,()=>{});

  // Risposta HTML
  res.send(`
<!DOCTYPE html><html lang="it"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Risultato Upload Atleti</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,800&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Montserrat',sans-serif;background:#f5f7fa;color:#333;padding:20px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);padding:24px}
    h1{margin-bottom:16px;color:#2c3e50}
    p{margin:.5rem 0;font-weight:500}
    a{display:inline-block;margin-top:20px;color:#007bff;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head><body>
  <div class="container">
    <h1>Upload Atleti – Risultato</h1>
    <p>Totale record: ${total}</p>
    <p>🆕 Inseriti: ${inserted}</p>
    <p>🔄 Aggiornati: ${updated}</p>
    <p>❌ Falliti: ${failed}</p>
    <a href="/uploadAthletes">← Torna a Upload Atleti</a>
  </div>
</body></html>
  `);
});

module.exports = router;

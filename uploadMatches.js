// uploadMatches.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const XLSX    = require("xlsx");
const pool    = require("./services/db");

const ALLOWED = [
  "match_id","event_unit_id","home_team","away_team",
  "home_score","away_score","status","match_date",
  "created_at","updated_at"
];

function normalize(raw) {
  const out = {};
  Object.entries(raw).forEach(([k,v])=>{
    const key = k.trim().toLowerCase().replace(/[\s\-]+/g,"_");
    if (!ALLOWED.includes(key) || v == null || v === "") return;
    out[key] = v;
  });
  return out;
}

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null,"uploads/"),
  filename:    (req,file,cb)=> cb(null,Date.now()+"_"+file.originalname)
});
const upload = multer({ storage });

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "uploadMatches.html"));
});

router.post("/", upload.single("matchesFile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nessun file caricato.");
  const ext = path.extname(req.file.originalname).toLowerCase();
  let data;
  try {
    if (ext === ".json") {
      data = JSON.parse(fs.readFileSync(req.file.path,"utf8"));
    } else {
      const wb = XLSX.readFile(req.file.path);
      const sh = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sh);
    }
  } catch(e) {
    return res.status(500).send("Errore nel parsing del file.");
  }

  const results = [];
  for (let raw of data) {
    const item = normalize(raw);
    if (!item.match_id) {
      // INSERT senza id
      delete item.match_id;
      const cols = Object.keys(item).map(k=>`\`${k}\``);
      const phs  = cols.map(_=>"?");
      const vals = Object.values(item);
      try {
        await new Promise((ok,ko)=>
          pool.query(
            `INSERT INTO matches (${cols.join(",")}, created_at, updated_at)
             VALUES (${phs.join(",")}, NOW(), NOW())`,
            vals, err=> err ? ko(err) : ok()
          )
        );
        results.push({action:"insert",success:true});
      } catch {
        results.push({action:"insert",success:false});
      }
    } else {
      // upsert su match_id
      const exists = await new Promise((ok,ko)=>
        pool.query(
          "SELECT 1 FROM matches WHERE match_id = ? LIMIT 1",
          [item.match_id], (e,r)=> e ? ko(e) : ok(r.length>0)
        )
      );
      if (exists) {
        const sets = [], vals = [];
        Object.entries(item).forEach(([k,v])=>{
          if (k==="match_id") return;
          sets.push(`\`${k}\` = ?`);
          vals.push(v);
        });
        sets.push("`updated_at` = NOW()");
        vals.push(item.match_id);
        try {
          await new Promise((ok,ko)=>
            pool.query(
              `UPDATE matches SET ${sets.join(",")} WHERE match_id = ?`,
              vals, err=> err ? ko(err) : ok()
            )
          );
          results.push({action:"update",success:true});
        } catch {
          results.push({action:"update",success:false});
        }
      } else {
        const cols = ["`match_id`"], phs = ["?"], vals = [item.match_id];
        Object.entries(item).forEach(([k,v])=>{
          if (k==="match_id") return;
          cols.push(`\`${k}\``);
          phs.push("?");
          vals.push(v);
        });
        phs.push("NOW()","NOW()");
        cols.push("`created_at`","`updated_at`");
        try {
          await new Promise((ok,ko)=>
            pool.query(
              `INSERT INTO matches (${cols.join(",")}) VALUES (${phs.join(",")})`,
              vals, err=> err ? ko(err) : ok()
            )
          );
          results.push({action:"insert",success:true});
        } catch {
          results.push({action:"insert",success:false});
        }
      }
    }
  }

  const total    = results.length;
  const inserted = results.filter(r=>r.action==="insert"&&r.success).length;
  const updated  = results.filter(r=>r.action==="update"&&r.success).length;
  const failed   = results.filter(r=>!r.success).length;
  fs.unlink(req.file.path,()=>{});

  res.send(`
<!DOCTYPE html><html lang="it"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Risultato Upload Partite</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;800&display=swap" rel="stylesheet">
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
  <h1>Upload Partite – Risultato</h1>
  <p>Totale record: ${total}</p>
  <p>🆕 Inseriti: ${inserted}</p>
  <p>🔄 Aggiornati: ${updated}</p>
  <p>❌ Falliti: ${failed}</p>
  <a href="/uploadMatches">← Torna a Upload Partite</a>
</div>
</body></html>
  `);
});

module.exports = router;

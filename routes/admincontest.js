const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

require('dotenv').config();

// Aggiungi il middleware per il parsing JSON
router.use(express.json());

// Connessione centralizzata usando .env
const getDb = () => mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});


// 1. GET tutte le sfide
router.get('/contests', async (req, res) => {
  try {
    const db = await getDb();
    const [rows] = await db.execute(`
      SELECT c.*, 
             o.username AS owner_username, 
             op.username AS opponent_username
      FROM contests c
      LEFT JOIN users o ON c.owner_user_id = o.user_id
      LEFT JOIN users op ON c.opponent_user_id = op.user_id
    `);
    
    await db.end();
    res.json(rows);
    console.log("Chiamata GET /admin-api/contests ricevuta");

  } catch (error) {
    console.error('Errore nel caricamento delle sfide:', error);
    res.status(500).json({ error: 'Errore nel caricamento delle sfide' });
  }
});

// 2. DELETE singola sfida
router.delete('/contests/:id', async (req, res) => {
  // 1) Carica la sfida
  const contestId = parseInt(req.params.id);
  try {
    const db = await getDb();

        const [[contest]] = await db.execute(
            `SELECT * FROM contests WHERE contest_id = ?`,
            [contestId]
          );
          if (!contest) {
            await db.end();
            return res.status(404).json({ error: 'Sfida non trovata' });
          }
      
          // ─── Verifica contest_type = 1 ───────────────────────────────────────────
        if (contest.contest_type !== 1) {
          await db.end();
          return res.status(400).json({ error: 'Operazione consentita solo su contest_type = 1' });
        }

    if (contest.status === 1 && contest.stake > 0 && contest.owner_user_id) {
      await db.execute(`UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?`, [contest.stake, contest.owner_user_id]);
    }

    await db.execute(`DELETE FROM contests WHERE contest_id = ?`, [contestId]);
    await db.end();

    res.json({ success: true, message: `Sfida #${contestId} cancellata con successo` });
  } catch (error) {
    console.error('Errore nella cancellazione della sfida:', error);
    res.status(500).json({ error: 'Errore nella cancellazione' });
  }
});

// 3. POST cancellazione multipla
router.post('/contests/bulk-delete', async (req, res) => {
  // Verifica se req.body è undefined
  if (!req.body) {
    console.error('req.body è undefined. Verifica il middleware express.json()');
    return res.status(400).json({ error: 'Formato richiesta non valido' });
  }
  
  // Usa la destrutturazione con valore di default (array vuoto)
  const { contestIds = [] } = req.body;
  
  if (!Array.isArray(contestIds) || contestIds.length === 0) {
    return res.status(400).json({ error: 'Formato contestIds non valido o array vuoto' });
  }

  try {
    const db = await getDb();

   
        const [rows] = await db.query(
            `SELECT * FROM contests WHERE contest_id IN (${contestIds.map(() => '?').join(',')})`,
            contestIds
          );
      
          // ─── Filtra solo contest_type = 1 ───────────────────────────────────────────
          const toDelete = rows.filter(c => c.contest_type === 1);
          if (toDelete.length === 0) {
            await db.end();
            return res.status(400).json({ error: 'Nessuna sfida con contest_type = 1 tra quelle selezionate' });
          }

      for (const contest of toDelete) {
      if (contest.status === 1 && contest.stake > 0 && contest.owner_user_id) {
        await db.execute(`UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?`, [contest.stake, contest.owner_user_id]);
      }
    }

        await db.query(
            `DELETE FROM contests WHERE contest_id IN (${toDelete.map(() => '?').join(',')})`,
            toDelete.map(c => c.contest_id)
          );
      
      await db.end();

         // restituisci davvero il numero di sfide di tipo 1 eliminate
         res.json({ success: true, deleted: toDelete.length });
  } catch (error) {
    console.error('Errore nella cancellazione multipla:', error);
    res.status(500).json({ error: 'Errore nella cancellazione delle sfide' });
  }
});

module.exports = router;

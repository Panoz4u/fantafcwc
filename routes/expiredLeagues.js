// routes/expiredLeagues.js
const express = require('express');
const router  = express.Router();
const mysql   = require('mysql2/promise');
require('dotenv').config();

// parsing JSON
router.use(express.json());

// stessa connessione di admincontest.js :contentReference[oaicite:0]{index=0}
const getDb = () => mysql.createConnection({
  host:     process.env.MYSQL_HOST,
  port:     process.env.MYSQL_PORT,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

// 1. GET tutte le expired leagues (contest_type=2, status=0 o 1)
router.get('/expired-leagues', async (req, res) => {
  try {
    const db = await getDb();
    const [rows] = await db.execute(`
      SELECT c.*,
             o.username AS owner_username,
             op.username AS opponent_username
      FROM contests c
      LEFT JOIN users o  ON c.owner_user_id   = o.user_id
      LEFT JOIN users op ON c.opponent_user_id = op.user_id
      WHERE c.contest_type = 2
        AND c.status IN (0,1)
    `);
    await db.end();
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /expired-leagues:', err);
    res.status(500).json({ error: 'Errore nel caricamento delle league' });
  }
});

// 2. DELETE singola expired league
router.delete('/expired-leagues/:id', async (req, res) => {
  const contestId = parseInt(req.params.id, 10);
  try {
    const db = await getDb();
    // carica contest
    const [[contest]] = await db.execute(
      `SELECT * FROM contests WHERE contest_id = ?`,
      [contestId]
    );
    if (!contest) {
      await db.end();
      return res.status(404).json({ error: 'League non trovata' });
    }
    if (contest.contest_type !== 2) {
      await db.end();
      return res.status(400).json({ error: 'Solo contest_type = 2' });
    }

    // PROCESSO DI CANCELLAZIONE
    if (contest.status === 0) {
      // Created: elimina contest + fantasy_teams + fantasy_team_entities
      await db.execute(
        `DELETE fte 
           FROM fantasy_team_entities fte
           JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
          WHERE ft.contest_id = ?`,
        [contestId]
      );
      await db.execute(
        `DELETE FROM fantasy_teams WHERE contest_id = ?`,
        [contestId]
      );
    } else if (contest.status === 1) {
      // Pending: refund + delete entities + teams
      // 1) carica tutti i fantasy_team
      const [teams] = await db.execute(
        `SELECT fantasy_team_id, user_id, total_cost
           FROM fantasy_teams
          WHERE contest_id = ?`,
        [contestId]
      );
      // 2) per ogni team, calcola rimborso e cancella entità
      for (const t of teams) {
        const refund = parseFloat(t.total_cost) * parseFloat(contest.multiply || 1);
        if (t.user_id && refund > 0) {
          await db.execute(
            `UPDATE users 
               SET teex_balance = teex_balance + ?
             WHERE user_id = ?`,
            [refund, t.user_id]
          );
        }
        await db.execute(
          `DELETE FROM fantasy_team_entities WHERE fantasy_team_id = ?`,
          [t.fantasy_team_id]
        );
      }
      // 3) elimina tutti i fantasy_team
      await db.execute(
        `DELETE FROM fantasy_teams WHERE contest_id = ?`,
        [contestId]
      );
    }

    // 3) elimina il contest stesso
    await db.execute(
      `DELETE FROM contests WHERE contest_id = ?`,
      [contestId]
    );

    await db.end();
    res.json({ success: true, message: `League #${contestId} cancellata` });
  } catch (err) {
    console.error('Errore DELETE /expired-leagues/:id:', err);
    res.status(500).json({ error: 'Errore nella cancellazione' });
  }
});

// 3. BULK DELETE expired leagues
router.post('/expired-leagues/bulk-delete', async (req, res) => {
  const { contestIds = [] } = req.body;
  if (!Array.isArray(contestIds) || contestIds.length === 0) {
    return res.status(400).json({ error: 'contestIds non valido o vuoto' });
  }
  try {
    const db = await getDb();
    // prendi solo quelle di tipo 2
    const [rows] = await db.query(
      `SELECT * 
         FROM contests 
        WHERE contest_id IN (${contestIds.map(()=>'?').join(',')})`,
      contestIds
    );
    const toDelete = rows.filter(c => c.contest_type === 2);
    if (toDelete.length === 0) {
      await db.end();
      return res.status(400).json({ error: 'Nessuna league di tipo=2 selezionata' });
    }

    for (const contest of toDelete) {
      const id = contest.contest_id;
      if (contest.status === 0) {
        // Created
        await db.execute(
          `DELETE fte 
             FROM fantasy_team_entities fte
             JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
            WHERE ft.contest_id = ?`,
          [id]
        );
        await db.execute(
          `DELETE FROM fantasy_teams WHERE contest_id = ?`,
          [id]
        );
      } else if (contest.status === 1) {
        // Pending
        const [teams] = await db.execute(
          `SELECT fantasy_team_id, user_id, total_cost
             FROM fantasy_teams
            WHERE contest_id = ?`,
          [id]
        );
        for (const t of teams) {
          const refund = parseFloat(t.total_cost) * parseFloat(contest.multiply || 1);
          if (t.user_id && refund > 0) {
            await db.execute(
              `UPDATE users 
                 SET teex_balance = teex_balance + ?
               WHERE user_id = ?`,
              [refund, t.user_id]
            );
          }
          await db.execute(
            `DELETE FROM fantasy_team_entities WHERE fantasy_team_id = ?`,
            [t.fantasy_team_id]
          );
        }
        await db.execute(
          `DELETE FROM fantasy_teams WHERE contest_id = ?`,
          [id]
        );
      }
      // elimina il contest
      await db.execute(
        `DELETE FROM contests WHERE contest_id = ?`,
        [id]
      );
    }

    await db.end();
    res.json({ success: true, deleted: toDelete.length });
  } catch (err) {
    console.error('Errore BULK DELETE /expired-leagues/bulk-delete:', err);
    res.status(500).json({ error: 'Errore nella cancellazione multipla' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../../services/db');

/* GET /event-players?event=30 */
router.get("/event-players", (req, res) => {
  const eventUnitId = req.query.event_unit_id;
  if (!eventUnitId) return res.status(400).json({ error: "Missing event unit ID" });
    const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, aep.event_unit_id, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
           m.home_team, m.away_team, m.status AS match_status,
           ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
           ht.team_name AS home_team_name, at.team_name AS away_team_name,
           t.team_3letter AS player_team_code, t.team_name AS player_team_name,
           m.match_id,
           aep.aep_id
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    LEFT JOIN teams t ON a.team_id = t.team_id
    LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
    LEFT JOIN teams ht ON m.home_team = ht.team_id
    LEFT JOIN teams at ON m.away_team = at.team_id
    WHERE aep.event_unit_id = ? AND aep.status = 1
  `;
  pool.query(sql, [eventUnitId], (er, rows) => {
    if (er) {
      console.error("DB error /event-players", er);
      return res.status(500).json({ error: "DB error /event-players" });
    }
    
    // Aggiungi log per visualizzare l'aep_id dei primi 3 atleti
    if (rows.length > 0) {
      console.log("Esempio di aep_id nei primi 3 atleti (event-players):");
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`Atleta ${i+1}: ${rows[i].athlete_shortname}, aep_id: ${rows[i].aep_id}, athlete_id: ${rows[i].athlete_id}`);
      }
    }
    
    res.json(rows);
  });
});

/* Endpoint per ottenere tutti gli atleti con status = 1 */
router.get("/all-active-athletes", (req, res) => {
  const sql = `
    SELECT aep.aep_id, aep.athlete_id, aep.event_unit_cost, aep.event_unit_id, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
           m.home_team, m.away_team, m.status AS match_status,
           ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
           ht.team_name AS home_team_name, at.team_name AS away_team_name,
           t.team_3letter AS player_team_code, t.team_name AS player_team_name,
           m.match_id
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    LEFT JOIN teams t ON a.team_id = t.team_id
    LEFT JOIN matches m ON aep.event_unit_id = m.event_unit_id AND (m.home_team = a.team_id OR m.away_team = a.team_id)
    LEFT JOIN teams ht ON m.home_team = ht.team_id
    LEFT JOIN teams at ON m.away_team = at.team_id
    WHERE aep.status = 1
  `;
    pool.query(sql, (er, rows) => {
    if (er) {
      console.error("DB error /all-active-athletes", er);
      return res.status(500).json({ error: "DB error /all-active-athletes" });
    }
    
    // Migliora i log per visualizzare l'aep_id degli atleti
    if (rows.length > 0) {
      console.log(`Totale atleti attivi trovati: ${rows.length}`);
      console.log("Esempio di aep_id nei primi 5 atleti:");
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        console.log(`Atleta ${i+1}: ${rows[i].athlete_shortname}, aep_id: ${rows[i].aep_id}, athlete_id: ${rows[i].athlete_id}`);
      }
      
      // Verifica quanti atleti hanno aep_id nullo o mancante
      const senzaAepId = rows.filter(player => !player.aep_id).length;
      console.log(`Atleti senza aep_id: ${senzaAepId} su ${rows.length} (${((senzaAepId/rows.length)*100).toFixed(2)}%)`);
    }
    
    res.json(rows);
  });
});

/**
 * Endpoint: GET /aep-event-unit
 * Query param: aep_id
 * Restituisce l'event_unit_id relativo all'aep_id fornito
 * Esempio: /aep-event-unit?aep_id=1234
 */
router.get("/aep-event-unit", (req, res) => {
  const aepId = req.query.aep_id;
  if (!aepId) {
    return res.status(400).json({ error: "Parametro aep_id mancante" });
  }
  const sql = `
    SELECT event_unit_id, athlete_unit_points, status, is_ended
    FROM athlete_eventunit_participation
    WHERE aep_id = ?
    LIMIT 1
  `;
  pool.query(sql, [aepId], (err, rows) => {
    if (err) {
      console.error("DB error /aep-event-unit", err);
      return res.status(500).json({ error: "Errore database" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Nessun risultato per questo aep_id" });
    }
    res.json({ 
      event_unit_id: rows[0].event_unit_id,
      athlete_unit_points: rows[0].athlete_unit_points,
      status: rows[0].status,
      is_ended: rows[0].is_ended
    });
  });
});
module.exports = router;
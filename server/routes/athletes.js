const express = require('express');
const router = express.Router();
const pool = require('../../db');

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
           m.match_id
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
    res.json(rows);
  });
});

/* Endpoint per ottenere tutti gli atleti con status = 1 */
router.get("/all-active-athletes", (req, res) => {
  const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, aep.event_unit_id, a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
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
    res.json(rows);
  });
});

module.exports = router;
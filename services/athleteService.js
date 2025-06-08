// services/athleteService.js

const pool = require('./db');

// utilities per formattare la data UTC
function nowUtcString() {
  return new Date().toISOString().slice(0,19).replace('T',' ');
}
/**
 * Restituisce tutti gli atleti partecipanti a uno specifico event_unit_id
 * @param {string|number} eventUnitId
 * @returns {Promise<Array>} array di righe con campi athlete + match + team
 */
function getEventPlayers(eventUnitId) {
  return new Promise((resolve, reject) => {
    if (!eventUnitId) {
      return reject(new Error('Missing event unit ID'));
    }
    const sql = `
      SELECT aep.athlete_id, aep.event_unit_cost, aep.event_unit_id,
             a.athlete_name, a.position, a.athlete_shortname, a.team_id, a.picture,
             m.home_team, m.away_team, m.status AS match_status,
             ht.team_3letter AS home_team_code, at.team_3letter AS away_team_code,
             ht.team_name AS home_team_name, at.team_name AS away_team_name,
             t.team_3letter AS player_team_code, t.team_name AS player_team_name,
             m.match_id,
             aep.aep_id
      FROM athlete_eventunit_participation aep
      JOIN athletes a 
        ON aep.athlete_id = a.athlete_id
      LEFT JOIN teams t 
        ON a.team_id = t.team_id
      LEFT JOIN matches m 
        ON aep.event_unit_id = m.event_unit_id 
         AND (m.home_team = a.team_id OR m.away_team = a.team_id)
      LEFT JOIN teams ht 
        ON m.home_team = ht.team_id
      LEFT JOIN teams at 
        ON m.away_team = at.team_id
      WHERE
        aep.event_unit_id = ?
        AND (
          aep.status = 1
          OR (aep.valid_from <= ? AND aep.valid_to >= ?)
        )
    `;
    const now = nowUtcString();
    pool.query(sql, [ eventUnitId, now, now ], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}


/**
 * Restituisce tutti gli atleti attivi (status = 1) su tutti gli event unit,
 * insieme al match (home/away + codici 3-letter + match_date) 
 * basato su aep.team_id.
 * @returns {Promise<Array>} array di righe con campi athlete + match + team
 */
function getAllActiveAthletes() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        aep.aep_id,
        aep.athlete_id,
        aep.event_unit_cost,
        aep.event_unit_id,

        a.athlete_name,
        a.position,
        a.athlete_shortname,
        a.picture,

        m.match_id,
        m.home_team,
        m.away_team,
        m.match_date,
        m.status AS match_status,

        ht.team_3letter AS home_team_code,
        at.team_3letter AS away_team_code,
        ht.team_name   AS home_team_name,
        at.team_name   AS away_team_name,

        -- ← Ecco la JOIN corretta: prendo il 3letter da aep.team_id, non da a.team_id
        t.team_3letter AS player_team_code,   -- ← MODIFICATO
        t.team_name   AS player_team_name,    -- (eventuale, se vuoi visualizzare anche il nome)

        aep.team_id   AS aep_team_id          -- (opzionale: l'id del team preso dall’aep)
      FROM athlete_eventunit_participation aep
      JOIN athletes a 
        ON aep.athlete_id = a.athlete_id

      /* ← MODIFICATO: ora collego i teams tramite aep.team_id anziché a.team_id */
      LEFT JOIN teams t 
        ON aep.team_id = t.team_id         -- ← MODIFICATO

      /* JOIN con i match per l’event_unit_id e per il team dell’aep */
      LEFT JOIN matches m 
        ON aep.event_unit_id = m.event_unit_id
       AND (m.home_team = aep.team_id OR m.away_team = aep.team_id)

      /* Per visualizzare home_team_code / away_team_code */
      LEFT JOIN teams ht 
        ON m.home_team = ht.team_id
      LEFT JOIN teams at 
        ON m.away_team = at.team_id
      WHERE
        aep.status = 1
        OR (aep.valid_from <= ? AND aep.valid_to >= ?)
    `;

    const now = nowUtcString();
    pool.query(sql, [ now, now ], (err, rows) => {
      resolve(rows);
    });
  });
}




/**
 * Restituisce i dettagli di un singolo aep_id (event_unit_id, punti, status, is_ended)
 * @param {string|number} aepId
 * @returns {Promise<Object>} { event_unit_id, athlete_unit_points, status, is_ended }
 */
function getAepEventUnit(aepId) {
  return new Promise((resolve, reject) => {
    if (!aepId) {
      return reject(new Error('Missing aep_id'));
    }
    const sql = `
      SELECT event_unit_id, athlete_unit_points, status, is_ended
      FROM athlete_eventunit_participation
      WHERE aep_id = ?
      LIMIT 1
    `;
    pool.query(sql, [aepId], (err, rows) => {
      if (err) return reject(err);
      if (!rows.length) {
        return reject(new Error('No data for this aep_id'));
      }
      resolve(rows[0]);
    });
  });
}


module.exports = {
  getEventPlayers,
  getAllActiveAthletes,
  getAepEventUnit
};

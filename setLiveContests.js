// setLiveContests.js
const pool = require("./db");

function setLiveContests(callback) {
  const updateQuery = `
    UPDATE contests c
    JOIN (
      SELECT DISTINCT ft.contest_id
      FROM fantasy_team_entities fte
      JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
      JOIN athlete_eventunit_participation aep ON fte.athlete_id = aep.athlete_id
      WHERE aep.event_unit_id = 30 AND aep.is_ended = 1
    ) AS sub ON c.contest_id = sub.contest_id
    SET c.status = 4, c.updated_at = NOW()
    WHERE c.status = 2;
  `;
  
  pool.query(updateQuery, (err, result) => {
    if (err) {
      console.error("Errore nell'aggiornamento dei contest live:", err);
      if(callback) callback(err);
      return;
    }
    console.log("Live contests set successfully", result.affectedRows);
    if(callback) callback(null, result);
  });
}

module.exports = setLiveContests;

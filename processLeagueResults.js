// processLeagueResults.js

const pool = require('./services/db');

// A) Imposta contest league live (status 2 -> 4)
async function setLiveLeagueContests(eventUnitId) {
  const query = `
    UPDATE contests SET status = 4, updated_at = NOW()
    WHERE contest_type = 2 AND status = 2 AND contest_id IN (
      SELECT DISTINCT ft.contest_id
      FROM fantasy_team_entities fte
      JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
      JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
      WHERE aep.event_unit_id = ? AND aep.is_ended = 1
    )
  `;
  await pool.promise().query(query, [eventUnitId]);
}

// B) Aggiorna punti per contest league
async function updateLeagueContests(eventUnitId) {
  const contests = await pool.promise().query(
    `SELECT contest_id FROM contests WHERE contest_type = 2 AND status = 4`
  );

  for (const { contest_id } of contests[0]) {
    await pool.promise().query(
      `UPDATE fantasy_teams ft
       SET total_points = (
         SELECT SUM(aep.athlete_unit_points)
         FROM fantasy_team_entities fte
         JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
         WHERE fte.fantasy_team_id = ft.fantasy_team_id
       )
       WHERE ft.contest_id = ?`,
      [contest_id]
    );
  }
}

// C) Chiude contest league, calcola teex e assegna posizioni
async function closeLeagueContests(eventUnitId) {
  const contests = await pool.promise().query(
    `SELECT contest_id, stake FROM contests WHERE contest_type = 2 AND status = 4`
  );

      for (const { contest_id, stake } of contests[0]) {
          // 1) verifico se ci sono ancora squadre non confermate (ft_status = 0)
          const [[{ zeroTeams }]] = await pool.promise().query(
            `SELECT COUNT(*) AS zeroTeams
             FROM fantasy_teams
             WHERE contest_id = ? AND ft_status = 0`,
            [contest_id]
          );
          if (zeroTeams > 0) {
            // ci sono team in status 0 → non chiudo
            continue;
          }
          // 2) conto quanti atleti non sono ancora ended
          const [[{ incomplete }]] = await pool.promise().query(
      `SELECT COUNT(*) AS incomplete
       FROM fantasy_team_entities fte
       JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
       JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
       WHERE ft.contest_id = ? AND aep.is_ended = 0`,
      [contest_id]
    );


       // 3) se non ci sono atleti incompleti, chiudo
     if (incomplete === 0) {
      await updateLeagueContests(eventUnitId);

      const [teams] = await pool.promise().query(
              // Prendiamo solo i team non rejected (ft_status != -1)
              const [teams] = await pool.promise().query(
                `SELECT fantasy_team_id, user_id, total_points 
                 FROM fantasy_teams
                 WHERE contest_id = ? AND ft_status != -1
                 ORDER BY total_points DESC`,
                [contest_id]
              );

      const payouts = [0.6, 0.3, 0.1];
      let positions = [];

      teams.forEach((team, idx) => {
        if (idx === 0 || team.total_points !== teams[idx - 1].total_points) {
          positions.push({ rank: positions.length + 1, teams: [team] });
        } else {
          positions[positions.length - 1].teams.push(team);
        }
      });

      for (const pos of positions) {
        const totalPct = payouts.slice(pos.rank - 1, pos.rank - 1 + pos.teams.length).reduce((a, b) => a + b, 0);
        const teexEach = (stake * totalPct) / pos.teams.length;

        for (const team of pos.teams) {
          await pool.promise().query(
            `UPDATE fantasy_teams SET ft_status = 5, ft_result = ?, ft_teex_won = ? WHERE fantasy_team_id = ?`,
            [pos.rank, teexEach, team.fantasy_team_id]
          );
          await pool.promise().query(
            `UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?`,
            [teexEach, team.user_id]
          );
        }
      }

      await pool.promise().query(
        `UPDATE contests SET status = 5, updated_at = NOW() WHERE contest_id = ?`,
        [contest_id]
      );
    }
  }
}

module.exports = {
  setLiveLeagueContests,
  updateLeagueContests,
  closeLeagueContests
};

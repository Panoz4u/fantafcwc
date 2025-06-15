// backend/services/leagueDetailsService.js

const pool = require('./db');

async function fetchLeagueDetails({ contest_id, currentUserId }) {
    // 1) Prendo i dati basilari del contest
  const contestSql = `
    SELECT contest_id, contest_name, multiply, status, stake
    FROM contests
    WHERE contest_id = ?
  `;
  const [contestRows] = await pool.promise().query(contestSql, [contest_id]);
  if (!contestRows.length) throw new Error('Contest non trovato');
  const contestData = contestRows[0];

  // 2) Recupero tutti i fantasy_teams relativi a questo contest, ordinati
     const fantasyTeamsSql = `
       SELECT ft.fantasy_team_id, ft.user_id, ft.total_cost, ft.total_points, ft.ft_status,
              ft.ft_teex_won,    -- << aggiunto
              u.username, u.avatar
    FROM fantasy_teams ft
    JOIN users u ON ft.user_id = u.user_id
    WHERE ft.contest_id = ?
    ORDER BY
      CASE
        WHEN ft.user_id = ? THEN 0
        WHEN ft.ft_status = 2 THEN 1
        WHEN ft.ft_status = 1 THEN 2
        ELSE 3
      END,
      u.username ASC
  `;
  const [fantasyTeams] = await pool.promise().query(fantasyTeamsSql, [contest_id, currentUserId]);

     // 3) Se il contest è 'finished' (status 5), calcolo max total_points e my ft_teex_won
     const maxTotalPoints = fantasyTeams
       .reduce((max, t) => Math.max(max, parseFloat(t.total_points) || 0), 0);
     const myTeam = fantasyTeams.find(t => t.user_id === currentUserId);
     if (contestData.status > 3) {
       contestData.maxTotalPoints = maxTotalPoints;
       contestData.myFtTeexWon    = myTeam ? myTeam.ft_teex_won : 0;
     }


  // 3) Per ciascun fantasy_team, prendo le `fantasy_team_entities`
  for (const team of fantasyTeams) {
        const entitiesSql = `
          SELECT
            fte.*,
            a.athlete_shortname,
            a.picture,
            aep.athlete_unit_points,
            aep.is_ended               AS is_ended,
            ht.team_3letter AS home_team_code,
            at.team_3letter AS away_team_code
          FROM fantasy_team_entities fte
          JOIN athletes a ON fte.athlete_id = a.athlete_id
          LEFT JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
          LEFT JOIN matches m
            ON m.event_unit_id = aep.event_unit_id
           AND (m.home_team = aep.team_id OR m.away_team = aep.team_id)
          LEFT JOIN teams ht ON m.home_team = ht.team_id
          LEFT JOIN teams at ON m.away_team = at.team_id
          WHERE fte.fantasy_team_id = ?
        `;
    const [entities] = await pool.promise().query(entitiesSql, [team.fantasy_team_id]);
    team.entities = entities;
  }

     // 5) Ritorno contest (+ eventuali maxPoints/myTeexWon) e fantasyTeams
     return { contest: contestData, fantasyTeams };
}

module.exports = { fetchLeagueDetails };

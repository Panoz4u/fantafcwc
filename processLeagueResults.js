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


          // 3) se non ci sono atleti incompleti, valutiamo come chiudere
          if (incomplete === 0) {
            await updateLeagueContests(eventUnitId);
    
            // prima prendo solo i confirmed (ft_status >1)
            const [confirmed] = await pool.promise().query(
              `SELECT fantasy_team_id, user_id, total_points 
               FROM fantasy_teams
               WHERE contest_id = ? AND ft_status > 1
               ORDER BY total_points DESC`,
              [contest_id]
            );
    
            if (confirmed.length === 2) {
              // H2H: tutto lo stake al primo
              const winner = confirmed[0];
              await pool.promise().query(
                `UPDATE fantasy_teams 
                 SET ft_status = 5, ft_result = 1, ft_teex_won = ? 
                 WHERE fantasy_team_id = ?`,
                [stake, winner.fantasy_team_id]
              );
              await pool.promise().query(
                `UPDATE fantasy_teams 
                 SET ft_status = 5, ft_result = 2, ft_teex_won = 0 
                 WHERE fantasy_team_id = ?`,
                [confirmed[1].fantasy_team_id]
              );
              // aggiorno i bilanci utenti
              await pool.promise().query(
                `UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?`,
                [stake, winner.user_id]
              );
            } else {
              // fallback alla logica 60/30/10 per ≥3
              const teams = confirmed; // già ordinati
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
                const totalPct = payouts
                  .slice(pos.rank - 1, pos.rank - 1 + pos.teams.length)
                  .reduce((a, b) => a + b, 0);
                const teexEach = (stake * totalPct) / pos.teams.length;
    
                for (const team of pos.teams) {
                  await pool.promise().query(
                    `UPDATE fantasy_teams 
                     SET ft_status = 5, ft_result = ?, ft_teex_won = ? 
                     WHERE fantasy_team_id = ?`,
                    [pos.rank, teexEach, team.fantasy_team_id]
                  );
                  await pool.promise().query(
                    `UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?`,
                    [teexEach, team.user_id]
                  );
                }
              }
            }
    
            // chiudo il contest
            await pool.promise().query(
              `UPDATE contests SET status = 5, updated_at = NOW() WHERE contest_id = ?`,
              [contest_id]
            );
          }



  }
}

// FORCE CLOSE LEAGUE CONTESTS (contest_type=2)
async function forceCloseLeagueContests(contestIds) {
  const db = pool.promise();

  for (const contestId of contestIds) {
    // ➜ salva lo status iniziale per capire se era Pending
    const [[{ status: initialStatus }]] = await db.query(
      `SELECT status FROM contests WHERE contest_id = ?`,
      [contestId]
    );

    // 1. Imposta contest status = 5
    await db.query(
      `UPDATE contests SET status = 5, updated_at = NOW() WHERE contest_id = ? AND contest_type = 2`,
      [contestId]
    );

    // 2. Aggiorna ft_status fantasy teams
    await db.query(
      `UPDATE fantasy_teams SET ft_status = -1 WHERE contest_id = ? AND ft_status = 0`,
      [contestId]
    );
    await db.query(
      `UPDATE fantasy_teams SET ft_status = 5 WHERE contest_id = ? AND ft_status IN (1,2,4)`,
      [contestId]
    );

    // 3. Calcola total_points
    const [teams] = await db.query(
      `SELECT fantasy_team_id FROM fantasy_teams WHERE contest_id = ? AND ft_status = 5`,
      [contestId]
    );
    for (const team of teams) {
      await db.query(
        `UPDATE fantasy_teams ft
         SET total_points = (SELECT IFNULL(SUM(aep.athlete_unit_points),0)
                             FROM fantasy_team_entities fte
                             JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
                             WHERE fte.fantasy_team_id = ft.fantasy_team_id)
         WHERE fantasy_team_id = ?`,
        [team.fantasy_team_id]
      );
    }

    // 4. Prendi i team ordinati per punti
    const [rankedTeams] = await db.query(
      `SELECT fantasy_team_id, user_id, total_points FROM fantasy_teams
       WHERE contest_id = ? AND ft_status = 5 ORDER BY total_points DESC`,
      [contestId]
    );

    // 4.1 Gestisci posizioni con parimerito
    let positions = [];
    rankedTeams.forEach((team, idx) => {
      if (idx === 0 || team.total_points !== rankedTeams[idx - 1].total_points) {
        positions.push({ rank: positions.length + 1, teams: [team] });
      } else {
        positions[positions.length - 1].teams.push(team);
      }
    });

    // Prendi stake del contest
    const [[contest]] = await db.query(`SELECT stake FROM contests WHERE contest_id = ?`, [contestId]);
    const stake = contest.stake;

        // 4.2 Calcola Teex vinti e aggiorna utenti
       if (rankedTeams.length === 1) {
          // Solo un partecipante → rimborso 100%
          const only = rankedTeams[0];
          await db.query(
            `UPDATE fantasy_teams 
               SET ft_result = 1,
                   ft_teex_won = ?
             WHERE fantasy_team_id = ?`,
            [stake, only.fantasy_team_id]
          );
          await db.query(
            `UPDATE users 
               SET teex_balance = teex_balance + ?
             WHERE user_id = ?`,
            [stake, only.user_id]
          );
        } else if (rankedTeams.length === 2) {
      const [first, second] = rankedTeams;
      if (first.total_points === second.total_points) {
        const halfStake = stake / 2;
        for (const team of [first, second]) {
          await db.query(`UPDATE fantasy_teams SET ft_result=1, ft_teex_won=? WHERE fantasy_team_id=?`, [halfStake, team.fantasy_team_id]);
          await db.query(`UPDATE users SET teex_balance=teex_balance+? WHERE user_id=?`, [halfStake, team.user_id]);
        }
      } else {
        await db.query(`UPDATE fantasy_teams SET ft_result=1, ft_teex_won=? WHERE fantasy_team_id=?`, [stake, first.fantasy_team_id]);
        await db.query(`UPDATE users SET teex_balance=teex_balance+? WHERE user_id=?`, [stake, first.user_id]);
        await db.query(`UPDATE fantasy_teams SET ft_result=2, ft_teex_won=0 WHERE fantasy_team_id=?`, [second.fantasy_team_id]);
      }
    } else {
      const payouts = [0.6, 0.3, 0.1];
      for (const pos of positions) {
        const totalPct = payouts.slice(pos.rank - 1, pos.rank - 1 + pos.teams.length).reduce((a, b) => a + b, 0);
        const teexEach = (stake * totalPct) / pos.teams.length;

        for (const team of pos.teams) {
          await db.query(`UPDATE fantasy_teams SET ft_result=?, ft_teex_won=? WHERE fantasy_team_id=?`, [pos.rank, teexEach, team.fantasy_team_id]);
          await db.query(`UPDATE users SET teex_balance=teex_balance+? WHERE user_id=?`, [teexEach, team.user_id]);
        }
      }
    }

    // 5. Se veniva da Pending (initialStatus=1) ➜ elimina tutto
    if (initialStatus === 1) {
      // elimina le entity dei fantasy team
      await db.query(
        `DELETE fte
           FROM fantasy_team_entities fte
           JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
          WHERE ft.contest_id = ?`,
        [contestId]
      );
      // elimina i fantasy teams
      await db.query(
        `DELETE FROM fantasy_teams WHERE contest_id = ?`,
        [contestId]
      );
      // infine elimina il contest
      await db.query(
        `DELETE FROM contests WHERE contest_id = ?`,
        [contestId]
      );
    }
  }
}

module.exports = {
  setLiveLeagueContests,
  updateLeagueContests,
  closeLeagueContests,
  forceCloseLeagueContests // <-- Aggiungi questa esportazione
};

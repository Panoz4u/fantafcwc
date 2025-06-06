// services/userContests.js
const pool = require('./db');

async function getUserContests(userId) {
  // 1) Controlla dati utente
  const [[userData]] = await pool
    .promise()
    .query(
      `
      SELECT user_id, username, teex_balance AS teexBalance, avatar, color
      FROM users
      WHERE user_id = ?
    `,
      [userId]
    );

  if (!userData) {
    throw new Error(`Utente non trovato con ID: ${userId}`);
  }

  // 2) Tutte le contest in cui sei owner/opponent (H2H e anche se in futuro si volesse usare per league da owner/opponent)
  const [rows] = await pool
    .promise()
    .query(
      `
      SELECT
        c.contest_name AS contest_name,
        c.contest_id,
        c.owner_user_id,
        c.opponent_user_id,
        c.status,
        c.stake,
        c.event_unit_id,
        c.multiply,
        c.contest_type,
        u1.username     AS owner_name,
        u1.avatar       AS owner_avatar,
        u1.color        AS owner_color,
        u2.username     AS opponent_name,
        u2.avatar       AS opponent_avatar,
        u2.color        AS opponent_color,
        ft.user_id      AS ft_user_id,
        ft.total_cost   AS ft_cost,
        ft.total_points AS ft_points,
        ft.ft_teex_won  AS ft_teex_won,
        ft.ft_result    AS ft_result
      FROM contests c
      JOIN users u1 ON c.owner_user_id    = u1.user_id
      JOIN users u2 ON c.opponent_user_id = u2.user_id
      LEFT JOIN fantasy_teams ft
        ON ft.contest_id = c.contest_id
        AND ft.user_id   = ?
      WHERE c.owner_user_id = ? OR c.opponent_user_id = ?
      ORDER BY c.created_at DESC
    `,
      [userId, userId, userId]
    );

  // 2.b) Tutte le private league (contest_type=2) in cui hai già un fantasy_team
  const [leagueRows] = await pool
    .promise()
    .query(
      `
      SELECT
        c.contest_name AS contest_name,
        c.contest_id,
        c.owner_user_id,
        c.opponent_user_id,
        c.status,
        c.stake,
        c.event_unit_id,
        c.multiply,
        c.contest_type,
        u1.username     AS owner_name,
        u1.avatar       AS owner_avatar,
        u1.color        AS owner_color,
        u2.username     AS opponent_name,
        u2.avatar       AS opponent_avatar,
        u2.color        AS opponent_color,
        ft.user_id      AS ft_user_id,
        ft.total_cost   AS ft_cost,
        ft.total_points AS ft_points,
        ft.ft_teex_won  AS ft_teex_won,
        ft.ft_result    AS ft_result
      FROM contests c
      JOIN users u1 ON c.owner_user_id    = u1.user_id
      JOIN users u2 ON c.opponent_user_id = u2.user_id
      JOIN fantasy_teams ft
        ON ft.contest_id = c.contest_id
        AND ft.user_id   = ?
      WHERE c.contest_type = 2
      ORDER BY c.created_at DESC
    `,
      [userId]
    );

  // 3) Unisci i due array di righe e raggruppa per contest_id
  const allRows = [...rows, ...leagueRows];

  const map = {};
  for (const r of allRows) {
    if (!map[r.contest_id]) {
      map[r.contest_id] = {
        contest_name:    r.contest_name,
        contest_id:      r.contest_id,
        owner_id:        r.owner_user_id,
        opponent_id:     r.opponent_user_id,
        status:          r.status,
        stake:           r.stake,
        event_unit_id:   r.event_unit_id,
        multiply:        r.multiply,
        contest_type:    r.contest_type,
        owner_name:      r.owner_name,
        owner_avatar:    r.owner_avatar,
        owner_color:     r.owner_color,
        opponent_name:   r.opponent_name,
        opponent_avatar: r.opponent_avatar,
        opponent_color:  r.opponent_color,
        fantasy_teams:   [],
        owner_fantasy_team:    null,
        opponent_fantasy_team: null,
        current_user_id: userId
      };
    }
    // Se c’è una riga ft_user_id (left join o join), aggiungila
    if (r.ft_user_id) {
      map[r.contest_id].fantasy_teams.push({
        contest_id:   r.contest_id,
        user_id:      r.ft_user_id,
        total_cost:   r.ft_cost,
        total_points: r.ft_points,
        ft_teex_won:  r.ft_teex_won,
        ft_result:    r.ft_result,
        ft_status:    null // verrà popolato nella query successiva
      });
    }
  }

  // 4) Recupera i campi ft_status per tutti i fantasy_teams dei contest trovati
  const contestIds = Object.keys(map);
  if (contestIds.length > 0) {
    const placeholders = contestIds.map(() => '?').join(',');
    const [teamsRows] = await pool
      .promise()
      .query(
        `
        SELECT
          contest_id,
          user_id,
          total_cost,
          total_points,
          ft_teex_won,
          ft_result,
          ft_status
        FROM fantasy_teams
        WHERE contest_id IN (${placeholders})
      `,
        contestIds
      );

    for (const team of teamsRows) {
      const contest = map[team.contest_id];
      if (!contest) continue;

      // Trova se esiste già un oggetto fantasy_teams con lo stesso user_id
      const existing = contest.fantasy_teams.find(ft =>
        String(ft.user_id) === String(team.user_id)
      );
      if (existing) {
        // Aggiorna solo ft_status e total_cost
        existing.ft_status = team.ft_status;
        existing.total_cost = team.total_cost;
      } else {
        // Se non esisteva, aggiungilo
        contest.fantasy_teams.push({
          contest_id:   team.contest_id,
          user_id:      team.user_id,
          total_cost:   team.total_cost,
          total_points: team.total_points,
          ft_teex_won:  team.ft_teex_won,
          ft_result:    team.ft_result,
          ft_status:    team.ft_status
        });
      }

      // Assegna owner_fantasy_team o opponent_fantasy_team se corrisponde
      if (String(team.user_id) === String(contest.owner_id)) {
        contest.owner_fantasy_team = {
          user_id:      team.user_id,
          total_cost:   team.total_cost,
          total_points: team.total_points,
          ft_teex_won:  team.ft_teex_won,
          ft_result:    team.ft_result,
          ft_status:    team.ft_status
        };
      } else if (String(team.user_id) === String(contest.opponent_id)) {
        contest.opponent_fantasy_team = {
          user_id:      team.user_id,
          total_cost:   team.total_cost,
          total_points: team.total_points,
          ft_teex_won:  team.ft_teex_won,
          ft_result:    team.ft_result,
          ft_status:    team.ft_status
        };
      }
    }
  }

   // 4.b) Aggiungo a ogni contest l’attributo “current_user_cost”:
   //      trovo il record fantasy_team corrispondente al current user e ne prendo total_cost
    for (const contId of Object.keys(map)) {
      const contestObj = map[contId];
      // Trovo il fantasy_team del currentUserId dentro contestObj.fantasy_teams
      const meTeam = (contestObj.fantasy_teams || []).find(ft =>
        String(ft.user_id) === String(userId)
      );
      // Se esiste, assegno total_cost; altrimenti 0
      contestObj.current_user_cost = meTeam
        ? parseFloat(meTeam.total_cost || 0)
        : 0;
    }


    // 5) Separazione active vs completed
    const all = Object.values(map);
    const active = all.filter(c => c.status !== 5);
    const completed = all.filter(c => c.status === 5);
  
    // 6) Aggiungo current_user_avatar e current_user_name a ogni contest
    //    (così il frontend non dovrà più indovinare da dove prendere l’avatar/nome)
    for (const c of active) {
      c.current_user_avatar = userData.avatar;
      c.current_user_name   = userData.username;
    }
    for (const c of completed) {
      c.current_user_avatar = userData.avatar;
      c.current_user_name   = userData.username;
    }
  
    return { user: userData, active, completed };
  }

module.exports = { getUserContests };

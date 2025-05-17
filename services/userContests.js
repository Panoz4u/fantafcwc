// services/userService.js
const pool = require('./db');  // import della connessione MySQL


async function getUserContests(userId) {
    // 1) dati base utente
    const [u] = await pool
    .promise()
    .query(
      `SELECT user_id, username, teex_balance, avatar, color
       FROM users WHERE user_id = ?`, [userId]
    );
    if (!u.length) throw new Error('Utente non trovato');
    const user = {
      userId:   u[0].user_id,
      username: u[0].username,
      balance:  u[0].teex_balance,
      avatar:   u[0].avatar,
      color:    u[0].color
    };
    console.log('DEBUG getUserContests user row:', u);
    // 2) tutte le contest dove è owner o opponent

    const [rows] = await pool
  .promise()                // <-- qui usi il wrapper promise
  .query (`
    SELECT
      c.contest_id, c.owner_user_id, c.opponent_user_id,
      c.status, c.stake, c.event_unit_id, c.multiply,
      u1.username AS owner_name, u1.avatar AS owner_avatar, u1.color AS owner_color,
      u2.username AS opponent_name, u2.avatar AS opponent_avatar, u2.color AS opponent_color,
      ft.user_id    AS ft_user_id,
      ft.total_cost AS ft_cost,
      ft.total_points, ft.ft_teex_won, ft.ft_result
    FROM contests c
      JOIN users u1 ON c.owner_user_id    = u1.user_id
      JOIN users u2 ON c.opponent_user_id = u2.user_id
      LEFT JOIN fantasy_teams ft
        ON ft.contest_id = c.contest_id
        AND ft.user_id   = ?
    WHERE c.owner_user_id = ? OR c.opponent_user_id = ?
    ORDER BY c.created_at DESC
  `, [userId, userId, userId]);

console.log('DEBUG getUserContests rows:', rows);
    
   
    // 3) raggruppa fantasy_teams per contest
    const map = {};
    for (const r of rows) {
      if (!map[r.contest_id]) {
        map[r.contest_id] = {
          contest_id:      r.contest_id,
          owner_id:        r.owner_user_id,
          opponent_id:     r.opponent_user_id,
          status:          r.status,
          stake:           r.stake,
          event_unit_id:   r.event_unit_id,
          multiply:        r.multiply,
          owner_name:      r.owner_name,
          owner_avatar:    r.owner_avatar,
          owner_color:     r.owner_color,
          opponent_name:   r.opponent_name,
          opponent_avatar: r.opponent_avatar,
          opponent_color:  r.opponent_color,
          fantasy_teams:   []
        };
      }
      if (r.ft_user_id) {
        map[r.contest_id].fantasy_teams.push({
          user_id:      r.ft_user_id,
          total_cost:   r.ft_cost,
          total_points: r.total_points,
          ft_teex_won:  r.ft_teex_won,
          ft_result:    r.ft_result
        });
      }
    }
  
    const all       = Object.values(map);
    const active    = all.filter(c => c.status !== 5);
    const completed = all.filter(c => c.status === 5);
  
    return { user, active, completed };
  }
  
  module.exports.getUserContests = getUserContests;
  
const express = require("express");
const app = express();
const port = 3000;
const pool = require("./db");

app.use(express.json());
app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Server avviato su http://localhost:${port}`);
});

/* ----------------------------------------------------------------------
   1) GET /users 
---------------------------------------------------------------------- */
app.get("/users", (req, res) => {
  pool.query("SELECT * FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error /users" });
    res.json(rows);
  });
});

app.post("/users", (req, res) => {
  const { username, email, teex_balance } = req.body;
  const passwordHash = "";
  if (!username || !email) {
    return res.status(400).json({ error: "Dati mancanti (username o email)" });
  }
  const sql = "INSERT INTO users (username, email, password_hash, teex_balance) VALUES (?, ?, ?, ?)";
  pool.query(sql, [username, email, passwordHash, teex_balance || 0], (err, result) => {
    if (err) {
      console.error("Errore INSERT users:", err);
      return res.status(500).json({ error: "Errore nell'inserimento utente" });
    }
    res.json({ message: "Utente creato con successo!", userId: result.insertId });
  });
});

/* ----------------------------------------------------------------------
   2) POST /contests (creare una nuova sfida)
---------------------------------------------------------------------- */
app.post("/contests", (req, res) => {
  const { owner, opponent } = req.body;
  if (!owner || !opponent) return res.status(400).json({ error: "Owner or Opponent missing" });
  const sql = `
    INSERT INTO contests (owner_user_id, opponent_user_id, contest_type, stake, status, created_at)
    VALUES (?, ?, 'head_to_head', 0, 0, NOW())
  `;
  pool.query(sql, [owner, opponent], (er, rs) => {
    if (er) {
      console.error("Error creating contest", er);
      return res.status(500).json({ error: "DB error creating contest" });
    }
    res.json({ message: "Contest creato con successo", contestId: rs.insertId });
  });
});

/* ----------------------------------------------------------------------
   3) GET /event-players?event=30
---------------------------------------------------------------------- */
app.get("/event-players", (req, res) => {
  const eId = req.query.event || 30;
  const sql = `
    SELECT aep.athlete_id, aep.event_unit_cost, a.athlete_name, a.position
    FROM athlete_eventunit_participation aep
    JOIN athletes a ON aep.athlete_id = a.athlete_id
    WHERE aep.event_unit_id = ?
  `;
  pool.query(sql, [eId], (er, rows) => {
    if (er) return res.status(500).json({ error: "DB error /event-players" });
    res.json(rows);
  });
});

/* ----------------------------------------------------------------------
   4) GET /user-landing-info?user=XX
---------------------------------------------------------------------- */
app.get("/user-landing-info", (req, res) => {
  const userId = req.query.user;
  if (!userId) return res.status(400).json({ error: "Missing user param" });
  const sqlUser = "SELECT user_id, username, teex_balance, avatar FROM users WHERE user_id = ?";
  pool.query(sqlUser, [userId], (err, ur) => {
    if (err) return res.status(500).json({ error: "DB error user" });
    if (!ur.length) return res.status(404).json({ error: "User not found" });
    const userData = ur[0];

    const sqlC = `
      SELECT c.contest_id, c.status, cs.status_name, c.stake,
             c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar,
             ft_o.total_cost AS owner_cost,
             c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar,
             ft_p.total_cost AS opponent_cost
      FROM contests c
      JOIN contests_status cs ON c.status = cs.status_id
      JOIN users ow ON c.owner_user_id = ow.user_id
      JOIN users op ON c.opponent_user_id = op.user_id
      LEFT JOIN fantasy_teams ft_o ON (ft_o.contest_id = c.contest_id AND ft_o.user_id = c.owner_user_id)
      LEFT JOIN fantasy_teams ft_p ON (ft_p.contest_id = c.contest_id AND ft_p.user_id = c.opponent_user_id)
      WHERE c.owner_user_id = ? OR c.opponent_user_id = ?
    `;
    pool.query(sqlC, [userId, userId], (er2, cr) => {
      if (er2) return res.status(500).json({ error: "DB error contests" });
      const active = [], completed = [];
      cr.forEach(r => {
        if (r.status === 4) completed.push(r); else active.push(r);
      });
      res.json({ user: userData, active, completed });
    });
  });
});

/* ----------------------------------------------------------------------
   5) GET /contest-details?contest=XX
---------------------------------------------------------------------- */
app.get("/contest-details", (req, res) => {
  const cId = req.query.contest;
  if (!cId) return res.status(400).json({ error: "Missing contest param" });
  const sql = `
    SELECT c.contest_id, c.status, cs.status_name, c.stake,
           c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar,
           ft_o.total_cost AS owner_cost,
           c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar,
           ft_p.total_cost AS opponent_cost
    FROM contests c
    JOIN contests_status cs ON c.status = cs.status_id
    JOIN users ow ON c.owner_user_id = ow.user_id
    JOIN users op ON c.opponent_user_id = op.user_id
    LEFT JOIN fantasy_teams ft_o ON (ft_o.contest_id = c.contest_id AND ft_o.user_id = c.owner_user_id)
    LEFT JOIN fantasy_teams ft_p ON (ft_p.contest_id = c.contest_id AND ft_p.user_id = c.opponent_user_id)
    WHERE c.contest_id = ?
  `;
  pool.query(sql, [cId], (er, rows) => {
    if (er) return res.status(500).json({ error: "DB error /contest-details" });
    if (!rows.length) return res.status(404).json({ error: "Contest non trovato" });
    const contestData = rows[0];

    // Query per estrarre i giocatori dei team
    const sqlTeam = `
      SELECT fte.*, a.athlete_shortname, a.picture, a.position,
             COALESCE(ROUND(aep.athlete_unit_points, 1), 0) AS athlete_points
      FROM fantasy_team_entities fte
      JOIN fantasy_teams ft ON fte.fantasy_team_id = ft.fantasy_team_id
      JOIN athletes a ON fte.athlete_id = a.athlete_id
      LEFT JOIN athlete_eventunit_participation aep 
             ON a.athlete_id = aep.athlete_id AND aep.event_unit_id = 30
      WHERE ft.contest_id = ? AND ft.user_id = ?
    `;
    pool.query(sqlTeam, [cId, contestData.owner_id], (er2, owRows) => {
      if (er2) {
        console.error("Error in owner team query:", er2);
        return res.status(500).json({ error: "DB error owner team" });
      }
      pool.query(sqlTeam, [cId, contestData.opponent_id], (er3, oppRows) => {
        if (er3) {
          console.error("Error in opponent team query:", er3);
          return res.status(500).json({ error: "DB error opponent team" });
        }
        res.json({
          contest: contestData,
          ownerTeam: owRows,
          opponentTeam: oppRows
        });
      });
    });
  });
});

/* ----------------------------------------------------------------------
   6) POST /confirm-squad
---------------------------------------------------------------------- */
app.post("/confirm-squad", (req, res) => {
  const { contestId, userId, players } = req.body;
  if (!contestId || !userId || !Array.isArray(players)) {
    return res.status(400).json({ error: "Dati mancanti o invalidi" });
  }
  let totalCost = 0;
  players.forEach(p => {
    totalCost += parseFloat(p.event_unit_cost || 0);
  });
  const sqlGet = "SELECT status, stake, owner_user_id FROM contests WHERE contest_id = ?";
  pool.query(sqlGet, [contestId], (er0, r0) => {
    if (er0) return res.status(500).json({ error: "DB error read contest" });
    if (!r0.length) return res.status(404).json({ error: "Contest non trovato" });
    const row = r0[0];
    let newStake = parseFloat(row.stake || 0);
    let newStatus = row.status;
    if (newStatus == 0 && parseInt(userId) == row.owner_user_id) {
      newStatus = 1; newStake += totalCost;
    } else if (newStatus == 1 && parseInt(userId) != row.owner_user_id) {
      newStatus = 2; newStake += totalCost;
    }
    const sqlUpd = `
      UPDATE contests SET stake = ?, status = ?, updated_at = NOW()
      WHERE contest_id = ?
    `;
    pool.query(sqlUpd, [newStake, newStatus, contestId], (er1, r1) => {
      if (er1) return res.status(500).json({ error: "DB error update contest" });
      const sqlTeam = `
        INSERT INTO fantasy_teams (contest_id, user_id, total_cost, updated_at)
        VALUES (?, ?, ?, NOW())
      `;
      pool.query(sqlTeam, [contestId, userId, totalCost], (er2, r2) => {
        if (er2) return res.status(500).json({ error: "DB error insert fantasy_team" });
        const newTId = r2.insertId;
        if (!players.length) return finishTeex();
        const values = players.map(p => [newTId, p.athlete_id, p.event_unit_cost]);
        const sqlEnt = `
          INSERT INTO fantasy_team_entities (fantasy_team_id, athlete_id, cost)
          VALUES ?
        `;
        pool.query(sqlEnt, [values], (er3, r3) => {
          if (er3) return res.status(500).json({ error: "DB error insert team_entities" });
          finishTeex();
        });

        function finishTeex() {
          const sqlUser = `
            UPDATE users SET teex_balance = teex_balance - ?
            WHERE user_id = ?
          `;
          pool.query(sqlUser, [totalCost, userId], (er4, r4) => {
            if (er4) return res.status(500).json({ error: "DB error updating user teex" });
            res.json({ message: "Squadra confermata con successo" });
          });
        }
      });
    });
  });
});

/* ----------------------------------------------------------------------
   Rotta di test base ("/")
---------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("Ciao da fanteex!");
});

// services/leagueService.js

/**
 * Assumiamo di avere due tabelle principali:
 *
 * 1) contests
 *    - contest_id       INT AUTO_INCREMENT PRIMARY KEY
 *    - contest_name     VARCHAR(255)       NOT NULL
 *    - owner_user_id    INT                NOT NULL
 *    - opponent_user_id INT                NULL   (usato per H2H, qui rimane NULL)
 *    - contest_type     INT                NOT NULL  (qui = 2 per “league”)
 *    - stake            DECIMAL(10,2)      NULL
 *    - status           INT                NULL
 *    - created_at       DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP
 *    - updated_at       DATETIME           NULL
 *    - event_unit_id    INT                NULL
 *    - multiply         DECIMAL(7,2)       NULL
 *
 * 2) fantasy_teams
 *    - fantasy_team_id  INT AUTO_INCREMENT PRIMARY KEY
 *    - contest_id       INT                NOT NULL  (FK → contests.contest_id)
 *    - user_id          INT                NOT NULL  (chi partecipa: owner o invitati)
 *    - total_cost       DECIMAL(10,2)      NOT NULL  DEFAULT 0
 *    - updated_at       TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *    - ft_status        INT                NULL     (0 = invited? 1 = confirmed? dipende dalle vostre convenzioni)
 *    - total_points     DECIMAL(10,2)      NOT NULL  DEFAULT 0
 *    - ft_teex_won      DECIMAL(10,2)      NOT NULL  DEFAULT 0
 *    - ft_result        INT                NULL
 *
 * In questo service:
 *  - getPossibleCompetitors(ownerId) → estrae tutti gli utenti diversi dall’owner
 *  - createPrivateLeague(ownerId, leagueName, competitorIds) → 
 *      1) INSERT in contests (type=2, contest_name = leagueName, owner_user_id = ownerId)
 *      2) Ottieni newContestId
 *      3) Per ciascuno userId (owner + competitorIds), fai INSERT in fantasy_teams
 *         con contest_id = newContestId, user_id = quella persona, restanti campi a default.
 *      4) Ritorna { contestId: newContestId }
 */

const pool = require('./db'); // il tuo modulo MySQL2 pool (promise‐based)

/**
 * Restituisce la lista di tutti gli utenti eccetto chi chiama (owner).
 *
 * @param {Number} ownerUserId
 * @returns {Promise<Array<Object>>} array di utenti { id, username, avatar, balance, email, … }
 */
async function getPossibleCompetitors(ownerUserId) {
  const promisePool = pool.promise();
  const sql = `
    SELECT 
      user_id   AS id,
      username,
      avatar,
      teex_balance AS balance,
      email
    FROM users
    WHERE user_id <> ?
    ORDER BY username ASC
  `;
  const [rows] = await promisePool.query(sql, [ownerUserId]);
  return rows;
}

/**
 * Crea un nuovo contest di tipo "Private League" (contest_type = 2),
 * e aggiunge owner + invitati nella tabella fantasy_teams.
 *
 * @param {Number} ownerId
 * @param {String} leagueName
 * @param {Array<Number>} competitorIds  // array di user_id da invitare
 * @returns {Promise<Number>} newContestId
 */
async function createPrivateLeague(ownerId, leagueName, competitorIds = []) {
  const promisePool = pool.promise();
  const conn = await promisePool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Inserisco in contests
        // Inserisco owner_user_id, MA anche opponent_user_id = ownerId (test H2H vs se stessi)
        // e forzo event_unit_id = 1 (ID di unità evento “fittizia”)
        const insertContestSQL = `
          INSERT INTO contests
            (owner_user_id,
             opponent_user_id,
             contest_name,
             contest_type,
             status,
             created_at,
             updated_at,
             event_unit_id,
             multiply)
          VALUES
            (?,      ?,              ?,            2,       0,      NOW(),       NOW(),       1,            1.00)
        `;
        // I parametri: [ownerId, ownerId, leagueName]
        const [contestResult] = await conn.query(insertContestSQL, [ownerId, ownerId, leagueName]);
        const newContestId = contestResult.insertId;

     // 2) Inserisco l’owner in fantasy_teams (ft_status = 0, come richiesto)
     const insertOwnerFTSQL = `
       INSERT INTO fantasy_teams
         (contest_id, user_id, total_cost, ft_status, total_points, ft_teex_won, ft_result, updated_at)
       VALUES
         (?, ?, 0, 0, 0, 0, 0, NOW())
     `;
     await conn.query(insertOwnerFTSQL, [newContestId, ownerId]);

    // 3) Inserisco ciascun competitor (status = 0 “invited”)
    const insertInviteFTSQL = `
      INSERT INTO fantasy_teams
        (contest_id, user_id, total_cost, ft_status, total_points, ft_teex_won, ft_result, updated_at)
      VALUES
        (?, ?, 0, 0, 0, 0, 0, NOW())
    `;
    for (const uid of competitorIds) {
      await conn.query(insertInviteFTSQL, [newContestId, uid]);
    }

    await conn.commit();
    return newContestId;

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Imposta ft_status a -1 per il fantasy team dell'utente in un contest.
 * @param {number} contestId
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function rejectFantasyTeam(contestId, userId) {
  const promisePool = pool.promise();
  const sql = `
    UPDATE fantasy_teams
       SET ft_status = -1,
           updated_at = NOW()
     WHERE contest_id = ? AND user_id = ?
  `;
  await promisePool.query(sql, [contestId, userId]);
}


// Conferma un contest di tipo “league”
async function confirmLeagueContest({ contestId, userId, fantasyTeamId, players, multiplier }) {
  console.log('🔧 [SRV] confermo lega:', { contestId, userId, fantasyTeamId, multiplier, playersCount: players.length });
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1) Leggo contest.status e contest.stake
    const [contestRows] = await conn.query(
      'SELECT status, stake FROM contests WHERE contest_id = ? FOR UPDATE',
      [contestId]
    );
    if (!contestRows.length) throw new Error('Contest non trovato');
    const { status: oldStatus, stake: oldStake = 0 } = contestRows[0];

      // 2) Se era 0 → passo a 1; se era 1 → passo a 2; altrimenti lascio invariato
      const newStatus = oldStatus === 0
                        ? 1
                        : oldStatus === 1
                          ? 2
                          : oldStatus;

    // 3) Calcolo nuovo stake = oldStake + totalCost * multiplier
    const totalCost = players.reduce((sum, p) => sum + (p.event_unit_cost||0), 0);
    const added     = totalCost * multiplier;
    const newStake  = parseFloat(oldStake) + added;

    // 4) Aggiorno contests
    await conn.query(
      `UPDATE contests
         SET status   = ?,
             stake    = ?,
             multiply = ?
       WHERE contest_id = ?`,
      [ newStatus, newStake, multiplier, contestId ]
    );

    // 5) Aggiorno fantasy_teams per il current user
    await conn.query(
      `UPDATE fantasy_teams
         SET ft_status  = 2,
             total_cost = ?
       WHERE fantasy_team_id = ?`,
      [ totalCost, fantasyTeamId ]
    );

    // 6) Ricreo le entità in fantasy_team_entities
    //    (elimino prima eventuali righe già presenti)
    await conn.query(
      `DELETE FROM fantasy_team_entities
       WHERE fantasy_team_id = ?`,
      [ fantasyTeamId ]
    );
    if (players.length) {
      const placeholders = players.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues   = players.flatMap(p => [
        fantasyTeamId,
        p.athleteId,
        p.event_unit_cost,
        p.aep_id ?? null
      ]);
      await conn.query(
        `INSERT INTO fantasy_team_entities
           (fantasy_team_id, athlete_id, cost, aep_id)
         VALUES ${placeholders}`,
        flatValues
      );
    }

       // 6b) Sottraggo al balance dell’utente il costo moltiplicato (added = totalCost * multiplier)
    await conn.query(
      `UPDATE users
        SET teex_balance = teex_balance - ?
       WHERE user_id = ?`,
      [ added, userId ]
    );
    // 7) Commit
    await conn.commit();
    return {
      message:        'Conferma league completata',
      newStatus,
      newStake,
      baseCost:       totalCost,
      multipliedCost: added
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPossibleCompetitors,
  createPrivateLeague,
  rejectFantasyTeam,
  confirmLeagueContest,    // ← export!
};
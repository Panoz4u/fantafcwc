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
  // Usiamo pool.promise() per lavorare con le Promise
  const promisePool = pool.promise();
  const conn = await promisePool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Inserisci in contests (contest_type = 2)
    const insertContestSQL = `
      INSERT INTO contests 
        (contest_name, owner_user_id, opponent_user_id, contest_type, stake, status, created_at) 
      VALUES 
        (?, ?, NULL, 2, NULL, 0, NOW())
    `;
    // Mettiamo opponent_user_id = NULL perché qui non serve (è una lega)
    // stake e gli altri valori possono rimanere a default. status = 0 (per esempio “aperto”)
    const [contestResult] = await conn.query(insertContestSQL, [leagueName, ownerId]);
    const newContestId = contestResult.insertId;

    // 2) Inserisci l’owner come prima riga in fantasy_teams
    const insertOwnerFTSQL = `
      INSERT INTO fantasy_teams 
        (contest_id, user_id, total_cost, ft_status, total_points, ft_teex_won, ft_result) 
      VALUES 
        (?, ?, 0, 1, 0, 0, 0)
    `;
    // ft_status=1 -> “confirmed” di default per l’owner
    await conn.query(insertOwnerFTSQL, [newContestId, ownerId]);

    // 3) Inserisci ciascun invitato (competitorIds) come “invited”
    const insertInviteFTSQL = `
      INSERT INTO fantasy_teams 
        (contest_id, user_id, total_cost, ft_status, total_points, ft_teex_won, ft_result) 
      VALUES 
        (?, ?, 0, 0, 0, 0, 0)
    `;
    // ft_status=0 -> “invited” o “pending”
    for (const uid of competitorIds) {
      await conn.query(insertInviteFTSQL, [newContestId, uid]);
    }

    // 4) Commit e ritorna l’ID del contest creato
    await conn.commit();
    return newContestId;

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPossibleCompetitors,
  createPrivateLeague
};

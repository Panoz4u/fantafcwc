// services/leagueService.js
// —————————————————————————————————————————————————————————————————————————
// Qui mettiamo la “logica di business” legata a League: leggere i competitor,
// creare una lega privata, aggiungere i partecipanti, ecc.
// Implementa le query sul database a tuo piacimento (ad esempio usando MySQL o Sequelize).
// Se già hai un userService per prelevare gli utenti, lo puoi richiamare di seguito.
// —————————————————————————————————————————————————————————————————————————

const pool = require('./db'); // adatta al tuo sistema di connessione

/**
 * Restituisce la lista di tutti gli utenti eccetto chi chiama (owner).
 * Puoi riusare /api/users/except esistente, ma diamo un wrapper per chiarezza.
 *
 * @param {Number} ownerUserId
 * @returns {Promise<Array<Object>>} lista di utenti con { id, username, avatar, balance, … }
 */
async function getPossibleCompetitors(ownerUserId) {
  // Usiamo pool.promise().query per tornare una Promise:
  const promisePool = pool.promise();
  const sql = `
    SELECT user_id AS id,
           username,
           avatar,
           teex_balance AS balance,
           email
      FROM users
     WHERE user_id <> ?
  `;
  const [rows] = await promisePool.query(sql, [ownerUserId]);
  return rows;
}
/**
 * Crea una nuova “private league” con un owner, un nome, e un array di competitorIds.
 * Restituisce l’ID della nuova lega.
 *
 * @param {Number} ownerId
 * @param {String} leagueName
 * @param {Array<Number>} competitorIds  // array di user_id da invitare
 * @returns {Promise<Number>} nuovo league_id
 */
async function createPrivateLeague(ownerId, leagueName, competitorIds = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Inserisci la riga nella tabella `leagues` (o come la chiami tu)
    const insertLeagueSQL = `
      INSERT INTO leagues (owner_user_id, name, created_at)
      VALUES (?, ?, NOW())
    `;
    const [insertResult] = await conn.query(insertLeagueSQL, [ownerId, leagueName]);
    const newLeagueId = insertResult.insertId;

    // 2) Inserisci l’owner come “partecipante confermato” (ad esempio, status = 'CONFIRMED')
    //     E la data di join la puoi settare a NOW().
    const insertOwnerSQL = `
      INSERT INTO league_participants (league_id, user_id, status, joined_at)
      VALUES (?, ?, 'CONFIRMED', NOW())
    `;
    await conn.query(insertOwnerSQL, [newLeagueId, ownerId]);

    // 3) Per ogni competitorId, inserisci una riga status = 'INVITED'
    const insertInviteSQL = `
      INSERT INTO league_participants (league_id, user_id, status, invited_at)
      VALUES (?, ?, 'INVITED', NOW())
    `;
    for (const uid of competitorIds) {
      await conn.query(insertInviteSQL, [newLeagueId, uid]);
    }

    await conn.commit();
    return newLeagueId;
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

// services/contestService.js

const pool = require('./db');   // punta a services/db.js

// Funzione di supporto per rollback in caso di errore
function rollbackTransaction(connection, err, reject, message) {
  connection.rollback(() => {
    connection.release();
    console.error('❌ Rollback causa errore:', message);
    if (err) console.error(err);
    return reject(new Error(message));
  });
}

/**
 * Conferma la squadra di un contest, salva fantasy_teams ed entità,
 * aggiorna lo stato del contest e il bilancio dell'utente.
 *
 * @param {Object} params
 * @param {number} params.contestId
 * @param {number} params.userId
 * @param {Array}  params.players        // array di { athleteId, event_unit_cost, aep_id }
 * @param {number} params.multiplier     // moltiplicatore scelto
 * @param {number} params.totalCost      // costo base squadra (somma dei costi)
 * @returns {Promise<Object>}            // { message, multiply, baseTeamCost, multipliedCost }
 */
function confirmSquad({ contestId, userId, players, multiplier = 1, totalCost }) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(new Error('Errore di connessione al database'));

      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          return reject(new Error('Errore nell\'avvio della transazione'));
        }

        // 1) Leggi lo stato corrente del contest
        const sqlGetContest = `
          SELECT status, stake, owner_user_id, opponent_user_id
          FROM contests WHERE contest_id = ?
        `;
        connection.query(sqlGetContest, [contestId], (err, contestRows) => {
          if (err) return rollbackTransaction(connection, err, reject, 'Errore nella lettura del contest');
          if (!contestRows.length) return rollbackTransaction(connection, null, reject, 'Contest non trovato');

          const contest = contestRows[0];
          let newStatus = contest.status;

          // 2) Determina il nuovo status in base a chi conferma
          if (newStatus === 0 && userId === contest.owner_user_id) {
            newStatus = 1;  // owner ha confermato
          } else if (newStatus === 1 && userId === contest.opponent_user_id) {
            newStatus = 2;  // opponent ha confermato
          } else {
            return rollbackTransaction(connection, null, reject, 'Stato contest non valido per la conferma');
          }

          // 3) Controlla che non abbia già una squadra
          const sqlCheckTeam = `
            SELECT fantasy_team_id
            FROM fantasy_teams
            WHERE contest_id = ? AND user_id = ?
          `;
          connection.query(sqlCheckTeam, [contestId, userId], (err, teamRows) => {
            if (err) return rollbackTransaction(connection, err, reject, 'Errore nella verifica della squadra esistente');
            if (teamRows.length) return rollbackTransaction(connection, null, reject, 'Hai già confermato una squadra per questo contest');

            // 4) Leggi il saldo utente
            const sqlGetUser = `SELECT teex_balance FROM users WHERE user_id = ?`;
            connection.query(sqlGetUser, [userId], (err, userRows) => {
              if (err) return rollbackTransaction(connection, err, reject, 'Errore nella lettura del saldo utente');
              if (!userRows.length) return rollbackTransaction(connection, null, reject, 'Utente non trovato');

              const userBalance    = parseFloat(userRows[0].teex_balance);
              const effectiveMul   = parseFloat(multiplier) || 1;
              const multipliedCost = parseFloat(totalCost) * effectiveMul;

              if (userBalance < multipliedCost) {
                return rollbackTransaction(connection, null, reject, 'Saldo Teex insufficiente');
              }

              // 5) Crea il fantasy team
              const sqlCreateTeam = `
                INSERT INTO fantasy_teams (user_id, contest_id, total_cost)
                VALUES (?, ?, ?)
              `;
              connection.query(sqlCreateTeam, [userId, contestId, totalCost], (err, result) => {
                if (err) return rollbackTransaction(connection, err, reject, 'Errore nella creazione della squadra');

                const teamId = result.insertId;

                // 6) Inserisci i giocatori scelti
                const values = players.map(p => [
                  teamId,
                  p.athleteId,
                  p.event_unit_cost || 0,
                  p.aep_id || null
                ]);
                const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
                const flat = values.flat();

                const sqlInsertPlayers = `
                  INSERT INTO fantasy_team_entities
                    (fantasy_team_id, athlete_id, cost, aep_id)
                  VALUES ${placeholders}
                `;
                connection.query(sqlInsertPlayers, flat, (err) => {
                  if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'inserimento degli atleti');

                  // 7) Aggiorna il contest (status, multiply, stake)
                  const isOwner = userId === contest.owner_user_id;
                  const updateFields = {};
                   // in ogni caso cambio stato...
                   updateFields.status = newStatus;
                  
                   // 1) Se è la PRIMA conferma (status 0→1), scrivo sempre il moltiplicatore
                   if (contest.status === 0) {
                     updateFields.multiply = effectiveMul;
                   }
                  
                   // 2) Se è l’owner al primo confirm o l’invited (status 1→2), gestisco lo stake
                   if (isOwner) {
                     // owner paga tutto subito
                     updateFields.stake = totalCost * effectiveMul;
                   } else if (contest.status === 1) {
                     // invited aggiunge il suo costo
                     updateFields.stake = parseFloat(contest.stake || 0) + (totalCost * effectiveMul);
                   }

                  const setClause = Object.keys(updateFields)
                   .map(k => `${k} = ?`)
                   .join(', ');
                 // CORRETTO:
                 const params = [...Object.values(updateFields), contestId];
                 const sqlUpdateContest = `UPDATE contests SET ${setClause} WHERE contest_id = ?`;

                  connection.query(sqlUpdateContest, params, (err) => {
                    if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'aggiornamento del contest');

                    // 8) Sottrai il costo dal saldo utente
                    const sqlUpdateBalance = `
                      UPDATE users
                      SET teex_balance = teex_balance - ?
                      WHERE user_id = ?
                    `;
                    connection.query(sqlUpdateBalance, [multipliedCost, userId], (err) => {
                      if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'aggiornamento del saldo');

                      // 9) Commit e fine
                      connection.commit(err => {
                        if (err) return rollbackTransaction(connection, err, reject, 'Errore nel commit della transazione');
                        connection.release();
                        resolve({
                          message: 'Squadra confermata con successo',
                          multiply: effectiveMul,
                          baseTeamCost: totalCost,
                          multipliedCost
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

module.exports = { confirmSquad };

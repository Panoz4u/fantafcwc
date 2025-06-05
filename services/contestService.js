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
          SELECT status, stake, owner_user_id, opponent_user_id, contest_type
          FROM contests WHERE contest_id = ?
        `;
        connection.query(sqlGetContest, [contestId], (err, contestRows) => {
          if (err) return rollbackTransaction(connection, err, reject, 'Errore nella lettura del contest');
          if (!contestRows.length) return rollbackTransaction(connection, null, reject, 'Contest non trovato');

          const contest = contestRows[0];
          let newStatus = contest.status;
          const isLeague = contest.contest_type === 2;

          // 2) Determina il nuovo status in base a chi conferma e al tipo di contest
          if (isLeague) {
            // Per i contest di tipo league, aggiorniamo sempre lo stato a 1
            newStatus = 1;
          } else {
            // Per i contest head-to-head, manteniamo la logica esistente
            if (newStatus === 0 && userId === contest.owner_user_id) {
              newStatus = 1;  // owner ha confermato
            } else if (newStatus === 1 && userId === contest.opponent_user_id) {
              newStatus = 2;  // opponent ha confermato
            } else {
              return rollbackTransaction(connection, null, reject, 'Stato contest non valido per la conferma');
            }
          }

          // 3) Controlla se l'utente ha già una squadra
          const sqlCheckTeam = `
            SELECT fantasy_team_id, ft_status
            FROM fantasy_teams
            WHERE contest_id = ? AND user_id = ?
          `;
          connection.query(sqlCheckTeam, [contestId, userId], (err, teamRows) => {
            if (err) return rollbackTransaction(connection, err, reject, 'Errore nella verifica della squadra esistente');
            
            // Per i contest di tipo league, l'utente potrebbe già avere un record in fantasy_teams
            const hasExistingTeam = teamRows.length > 0;
            const existingTeamId = hasExistingTeam ? teamRows[0].fantasy_team_id : null;
            const existingStatus = hasExistingTeam ? teamRows[0].ft_status : null;
            
            // Se non è una lega e ha già una squadra, restituisci errore
            if (!isLeague && hasExistingTeam) {
              return rollbackTransaction(connection, null, reject, 'Hai già confermato una squadra per questo contest');
            }
            
            // Se è una lega e ha già confermato (ft_status > 0), restituisci errore
            if (isLeague && hasExistingTeam && existingStatus > 0) {
              return rollbackTransaction(connection, null, reject, 'Hai già confermato una squadra per questo contest');
            }

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

              // 5) Crea o aggiorna il fantasy team
              let teamId;
              let teamOperation;
              
              if (isLeague && hasExistingTeam) {
                // Aggiorna il fantasy team esistente per la lega
                const sqlUpdateTeam = `
                  UPDATE fantasy_teams
                  SET total_cost = ?, ft_status = ?, updated_at = NOW()
                  WHERE fantasy_team_id = ?
                `;
                const ftStatus = userId === contest.owner_user_id ? 2 : 1; // 2 per owner, 1 per altri
                teamOperation = new Promise((resolve, reject) => {
                  connection.query(sqlUpdateTeam, [totalCost, ftStatus, existingTeamId], (err, result) => {
                    if (err) return reject(err);
                    teamId = existingTeamId;
                    resolve();
                  });
                });
              } else {
                // Crea un nuovo fantasy team (per head-to-head o per lega se non esiste)
                const sqlCreateTeam = `
                  INSERT INTO fantasy_teams (user_id, contest_id, total_cost, ft_status, updated_at)
                  VALUES (?, ?, ?, ?, NOW())
                `;
                const ftStatus = isLeague && userId === contest.owner_user_id ? 2 : 0;
                teamOperation = new Promise((resolve, reject) => {
                  connection.query(sqlCreateTeam, [userId, contestId, totalCost, ftStatus], (err, result) => {
                    if (err) return reject(err);
                    teamId = result.insertId;
                    resolve();
                  });
                });
              }
              
              teamOperation.then(() => {
                // 6) Rimuovi eventuali giocatori esistenti per questo team
                const sqlDeletePlayers = `
                  DELETE FROM fantasy_team_entities
                  WHERE fantasy_team_id = ?
                `;
                connection.query(sqlDeletePlayers, [teamId], (err) => {
                  if (err) return rollbackTransaction(connection, err, reject, 'Errore nella rimozione degli atleti esistenti');
                  
                  // 7) Inserisci i giocatori scelti
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

                    // 8) Aggiorna il contest (status, multiply, stake)
                    const isOwner = userId === contest.owner_user_id;
                    const updateFields = {};
                    // in ogni caso cambio stato...
                    updateFields.status = newStatus;
                    
                    // 1) Se è la PRIMA conferma (status 0→1), scrivo sempre il moltiplicatore
                    if (contest.status === 0) {
                      updateFields.multiply = effectiveMul;
                    }
                    
                    // 2) Se è l'owner al primo confirm o l'invited (status 1→2), gestisco lo stake
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
                    const params = [...Object.values(updateFields), contestId];
                    const sqlUpdateContest = `UPDATE contests SET ${setClause} WHERE contest_id = ?`;

                    connection.query(sqlUpdateContest, params, (err) => {
                      if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'aggiornamento del contest');

                      // Per i contest di tipo league, aggiorniamo lo stato dei fantasy teams
                      if (isLeague && isOwner) {
                        const sqlUpdateFantasyTeams = `
                          UPDATE fantasy_teams
                          SET ft_status = 1
                          WHERE contest_id = ? AND ft_status = 0 AND user_id != ?
                        `;
                        connection.query(sqlUpdateFantasyTeams, [contestId, userId], (err) => {
                          if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'aggiornamento dei fantasy teams');
                          
                          // Continua con l'aggiornamento del saldo utente
                          updateUserBalance();
                        });
                      } else {
                        // Per i contest head-to-head, continua con l'aggiornamento del saldo utente
                        updateUserBalance();
                      }

                      function updateUserBalance() {
                        // 9) Sottrai il costo dal saldo utente
                        const sqlUpdateBalance = `
                          UPDATE users
                          SET teex_balance = teex_balance - ?
                          WHERE user_id = ?
                        `;
                        connection.query(sqlUpdateBalance, [multipliedCost, userId], (err) => {
                          if (err) return rollbackTransaction(connection, err, reject, 'Errore nell\'aggiornamento del saldo');

                          // 10) Commit e fine
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
                      }
                    });
                  });
                });
              }).catch(err => {
                return rollbackTransaction(connection, err, reject, 'Errore nell\'operazione sul fantasy team');
              });
            });
          });
        });
      });
    });
  });
}



/**
 * Restituisce contest + ownerTeam + opponentTeam
 */
async function getContestDetails({ contestId, currentUserId, eventUnitId }) {
  // 1) Prendo i dati basilari del contest
  const sqlContest = `
    SELECT c.contest_id, c.status, cs.status_name, c.stake, c.contest_type, c.contest_name,
           c.owner_user_id AS owner_id, ow.username AS owner_name, ow.avatar AS owner_avatar, ow.color AS owner_color,
           ft_o.total_cost AS owner_cost, ft_o.fantasy_team_id AS owner_team_id,
           ft_o.total_points AS owner_points, ft_o.ft_teex_won AS owner_teex_won,
           c.opponent_user_id AS opponent_id, op.username AS opponent_name, op.avatar AS opponent_avatar, op.color AS opponent_color,
           ft_p.total_cost AS opponent_cost, ft_p.fantasy_team_id AS opponent_team_id,
           ft_p.total_points AS opponent_points, ft_p.ft_teex_won AS opponent_teex_won,
           c.event_unit_id, c.multiply,
           (SELECT COUNT(*) FROM fantasy_teams WHERE contest_id = c.contest_id) AS invited_count
    FROM contests c
    JOIN contests_status cs ON c.status = cs.status_id
    JOIN users ow ON c.owner_user_id = ow.user_id
    LEFT JOIN users op ON c.opponent_user_id = op.user_id
    LEFT JOIN fantasy_teams ft_o ON (ft_o.contest_id = c.contest_id AND ft_o.user_id = c.owner_user_id)
    LEFT JOIN fantasy_teams ft_p ON (ft_p.contest_id = c.contest_id AND ft_p.user_id = c.opponent_user_id)
    WHERE c.contest_id = ?
  `;
  const [rows] = await pool.promise().query(sqlContest, [contestId]);
  if (!rows.length) throw new Error('Contest non trovato');
  const contestData = rows[0];
  
  // Aggiungiamo current_user_id per facilitare la logica nel frontend
  contestData.current_user_id = currentUserId;
  
   // 2) Carico le righe della squadra owner e opponent unendo direttamente su fte.aep_id:
    //    in questo modo pescano correttamente i punti anche se eventUnitId venisse sbagliato o nullo.
    const sqlTeamByAep = `
    SELECT
      fte.athlete_id,
      aep.event_unit_id                  AS event_unit_id,
      COALESCE(ROUND(aep.athlete_unit_points, 1), 0) AS athlete_unit_points,
      aep.is_ended                       AS is_ended,
      aep.event_unit_cost                AS event_unit_cost,
      aep.status                         AS status,
      a.athlete_name                     AS athlete_name,
      a.athlete_shortname                AS athlete_shortname,
      a.position                         AS position,
      a.picture                          AS picture,
  
      -- Qui prende il team “effettivo” scelto in quell’AEP:
      aep.team_id                        AS aep_team_id,
  
      -- Dalla tabella teams t (collegata a aep.team_id) prendo il codice 3‐letter e il nome
      t.team_name                        AS player_team_name,
      t.team_3letter                     AS player_team_code,
      t.team_logo                        AS player_team_logo,
      t.team_kit                         AS player_team_kit,
  
      -- Ora unisco con matches per recuperare il match corrispondente:
      m.match_id,
      m.home_team                        AS match_home_id,
      m.away_team                        AS match_away_id,
      m.match_date,
      m.status                           AS match_status,
  
      -- E ottengo i codici 3‐letter delle due squadre del match:
      ht.team_3letter                    AS home_team_code,
      at.team_3letter                    AS away_team_code,
      ht.team_name                       AS home_team_name,
      at.team_name                       AS away_team_name
  
    FROM fantasy_team_entities fte
  
    LEFT JOIN athlete_eventunit_participation aep
      ON fte.aep_id = aep.aep_id
  
    JOIN athletes a
      ON fte.athlete_id = a.athlete_id
  
    -- Prendo il codice 3‐letter del team “di quell’AEP”:
    LEFT JOIN teams t
      ON aep.team_id = t.team_id
  
    /* 
     * A questo punto unisco matches in base a:
     *   1) stessa event_unit_id
     *   2) aep.team_id corrisponde a home_team OPPURE away_team
     */
    LEFT JOIN matches m
      ON aep.event_unit_id = m.event_unit_id
     AND (m.home_team = aep.team_id OR m.away_team = aep.team_id)
  
    /* Per ogni riga di “matches” ricavo i codici 3‐letter di home e away: */
    LEFT JOIN teams ht
      ON m.home_team = ht.team_id
    LEFT JOIN teams at
      ON m.away_team = at.team_id
  
    WHERE fte.fantasy_team_id = ?
  `;
    // Eseguo due query con i due fantasy_team_id già presenti in contestData:
    const [ownerRows] = await pool.promise().query(sqlTeamByAep, [
      contestData.owner_team_id
    ]);
    const [oppRows] = await pool.promise().query(sqlTeamByAep, [
      contestData.opponent_team_id
    ]);

  // 3) Se qualche atleta è finito, calcolo result e status_display
  const ended = ownerRows.concat(oppRows).some(r => r.is_ended);
  if (ended) {
    const sumOwner    = ownerRows.reduce((s,r) => s + (r.athlete_points||0), 0);
    const sumOpponent = oppRows   .reduce((s,r) => s + (r.athlete_points||0), 0);
    contestData.result = (parseInt(currentUserId)===contestData.owner_id)
      ? `${sumOwner.toFixed(1)}-${sumOpponent.toFixed(1)}`
      : `${sumOpponent.toFixed(1)}-${sumOwner.toFixed(1)}`;
  }
  contestData.status_display = ended ? contestData.result : contestData.status_name;

  return {
    contest: contestData,
    ownerTeam: ownerRows,
    opponentTeam: oppRows
  };
}
module.exports = {
  confirmSquad,
  getContestDetails
};
const pool = require('./db');

// Funzione per ottenere tutte le sfide
function getAllContests() {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM contests ORDER BY created_at ASC', (err, results) => {
      if (err) {
        console.error('Errore nel recupero delle sfide:', err);
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

// Funzione per ottenere le sfide filtrate per stato
function getContestsByStatus(status) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM contests WHERE status = ? ORDER BY created_at ASC', [status], (err, results) => {
      if (err) {
        console.error('Errore nel recupero delle sfide per stato:', err);
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

// Funzione per ottenere una singola sfida per ID
function getContestById(contestId) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM contests WHERE contest_id = ?', [contestId], (err, results) => {
      if (err) {
        console.error('Errore nel recupero della sfida:', err);
        reject(err);
        return;
      }
      
      if (results.length === 0) {
        reject(new Error('Sfida non trovata'));
        return;
      }
      
      resolve(results[0]);
    });
  });
}

// Funzione per eliminare una sfida
function deleteContest(contestId) {
  return new Promise((resolve, reject) => {
    // Prima ottieni i dettagli della sfida per verificare lo stato e lo stake
    getContestById(contestId)
      .then(contest => {
        // Se la sfida è in stato 0 o 1, restituisci lo stake all'owner
        if (contest.status === 0 || contest.status === 1) {
          // Aggiorna il teex_balance dell'owner
          pool.query(
            'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
            [contest.stake, contest.owner_user_id],
            (err) => {
              if (err) {
                console.error('Errore nella restituzione dello stake:', err);
                reject(err);
                return;
              }
              
              // Ora cancella la sfida
              pool.query('DELETE FROM contests WHERE contest_id = ?', [contestId], (err) => {
                if (err) {
                  console.error('Errore nella cancellazione della sfida:', err);
                  reject(err);
                  return;
                }
                
                resolve({ success: true, message: 'Sfida cancellata con successo' });
              });
            }
          );
        } else {
          // Se la sfida non è in stato 0 o 1, cancellala semplicemente
          pool.query('DELETE FROM contests WHERE contest_id = ?', [contestId], (err) => {
            if (err) {
              console.error('Errore nella cancellazione della sfida:', err);
              reject(err);
              return;
            }
            
            resolve({ success: true, message: 'Sfida cancellata con successo' });
          });
        }
      })
      .catch(err => {
        reject(err);
      });
  });
}

// Funzione per eliminare più sfide contemporaneamente
function deleteMultipleContests(contestIds) {
  return new Promise((resolve, reject) => {
    if (!contestIds || !Array.isArray(contestIds) || contestIds.length === 0) {
      reject(new Error('Nessuna sfida selezionata'));
      return;
    }
    
    // Per ogni sfida in stato 0 o 1, restituisci lo stake all'owner
    pool.query(
      'SELECT * FROM contests WHERE contest_id IN (?) AND (status = 0 OR status = 1)',
      [contestIds],
      (err, results) => {
        if (err) {
          console.error('Errore nel recupero delle sfide:', err);
          reject(err);
          return;
        }
        
        // Crea un array di promesse per aggiornare il teex_balance degli owner
        const updatePromises = results.map(contest => {
          return new Promise((resolve, reject) => {
            pool.query(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [contest.stake, contest.owner_user_id],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });
        
        // Esegui tutte le promesse
        Promise.all(updatePromises)
          .then(() => {
            // Ora cancella tutte le sfide
            pool.query('DELETE FROM contests WHERE contest_id IN (?)', [contestIds], (err) => {
              if (err) {
                console.error('Errore nella cancellazione delle sfide:', err);
                reject(err);
                return;
              }
              
              resolve({ success: true, message: 'Sfide cancellate con successo', count: contestIds.length });
            });
          })
          .catch(err => {
            console.error('Errore nella restituzione degli stake:', err);
            reject(err);
          });
      }
    );
  });
}

// Funzione per contare le sfide scadute
function countExpiredContests() {
  return new Promise((resolve, reject) => {
    // Calcola la data di un giorno fa
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    pool.query(
      'SELECT COUNT(*) AS count FROM contests WHERE (status = 0 OR status = 1) AND created_at < ?',
      [oneDayAgoStr],
      (err, results) => {
        if (err) {
          console.error('Errore nel conteggio delle sfide scadute:', err);
          reject(err);
          return;
        }
        
        resolve(results[0].count);
      }
    );
  });
}

// Funzione per eliminare tutte le sfide scadute
function deleteExpiredContests() {
  return new Promise((resolve, reject) => {
    // Calcola la data di un giorno fa
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    // Prima ottieni tutte le sfide scadute in stato 0 o 1
    pool.query(
      'SELECT * FROM contests WHERE (status = 0 OR status = 1) AND created_at < ?',
      [oneDayAgoStr],
      (err, results) => {
        if (err) {
          console.error('Errore nel recupero delle sfide scadute:', err);
          reject(err);
          return;
        }
        
        // Crea un array di promesse per aggiornare il teex_balance degli owner
        const updatePromises = results.map(contest => {
          return new Promise((resolve, reject) => {
            pool.query(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [contest.stake, contest.owner_user_id],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });
        
        // Esegui tutte le promesse
        Promise.all(updatePromises)
          .then(() => {
            // Ora cancella tutte le sfide scadute
            pool.query(
              'DELETE FROM contests WHERE (status = 0 OR status = 1) AND created_at < ?',
              [oneDayAgoStr],
              (err) => {
                if (err) {
                  console.error('Errore nella cancellazione delle sfide scadute:', err);
                  reject(err);
                  return;
                }
                
                resolve({ success: true, message: 'Sfide scadute cancellate con successo', count: results.length });
              }
            );
          })
          .catch(err => {
            console.error('Errore nella restituzione degli stake:', err);
            reject(err);
          });
      }
    );
  });
}

module.exports = {
  getAllContests,
  getContestsByStatus,
  getContestById,
  deleteContest,
  deleteMultipleContests,
  countExpiredContests,
  deleteExpiredContests
};
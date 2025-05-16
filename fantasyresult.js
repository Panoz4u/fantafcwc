const express = require('express');
const router = express.Router();
const pool = require('./services/db');

/**
 * Calcola il punteggio totale di un fantasy team
 * @param {number} fantasyTeamId - ID del fantasy team
 * @returns {Promise<number>} - Punteggio totale
 */
function calculateFantasyTeamPoints(fantasyTeamId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT SUM(COALESCE(aep.athlete_unit_points, 0)) AS total_points
      FROM fantasy_team_entities fte
      LEFT JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
      WHERE fte.fantasy_team_id = ?
    `;
    
    pool.query(query, [fantasyTeamId], (err, results) => {
      if (err) {
        console.error('Errore nel calcolo dei punti del fantasy team:', err);
        reject(err);
        return;
      }
      
      const totalPoints = results[0]?.total_points || 0;
      resolve(totalPoints);
    });
  });
}

/**
 * Calcola i punteggi dei fantasy team per un contest specifico
 * @param {number} contestId - ID del contest
 * @returns {Promise<Object>} - Oggetto con i punteggi e gli ID dei fantasy team
 */
function calculateContestPoints(contestId) {
  return new Promise((resolve, reject) => {
    // Prima otteniamo owner_id e opponent_id dal contest
    const contestQuery = `
      SELECT owner_user_id, opponent_user_id
      FROM contests
      WHERE contest_id = ?
    `;
    
    pool.query(contestQuery, [contestId], (err, contestResults) => {
      if (err) {
        console.error('Errore nel recupero dei dati del contest:', err);
        reject(err);
        return;
      }
      
      if (!contestResults || contestResults.length === 0) {
        reject(new Error('Contest non trovato'));
        return;
      }
      
      const ownerId = contestResults[0].owner_user_id;
      const opponentId = contestResults[0].opponent_user_id;
      
      // Ora otteniamo i fantasy team IDs per questo contest
      const teamsQuery = `
        SELECT fantasy_team_id, user_id
        FROM fantasy_teams
        WHERE contest_id = ? AND user_id IN (?, ?)
      `;
      
      pool.query(teamsQuery, [contestId, ownerId, opponentId], (err, teamResults) => {
        if (err) {
          console.error('Errore nel recupero dei fantasy team:', err);
          reject(err);
          return;
        }
        
        if (!teamResults || teamResults.length === 0) {
          reject(new Error('Nessun fantasy team trovato per questo contest'));
          return;
        }
        
        let ownerTeamId = null;
        let opponentTeamId = null;
        
        // Assegna gli ID dei team in base all'utente
        teamResults.forEach(team => {
          if (team.user_id == ownerId) {
            ownerTeamId = team.fantasy_team_id;
          } else if (team.user_id == opponentId) {
            opponentTeamId = team.fantasy_team_id;
          }
        });
        
        // Calcola i punti per entrambi i team
        const promises = [];
        
        if (ownerTeamId) {
          promises.push(
            calculateFantasyTeamPoints(ownerTeamId)
              .then(points => ({ userId: ownerId, teamId: ownerTeamId, points }))
          );
        }
        
        if (opponentTeamId) {
          promises.push(
            calculateFantasyTeamPoints(opponentTeamId)
              .then(points => ({ userId: opponentId, teamId: opponentTeamId, points }))
          );
        }
        
        Promise.all(promises)
          .then(results => {
            // Organizza i risultati
            const response = {
              contest_id: contestId,
              owner_id: ownerId,
              opponent_id: opponentId,
              teams: results
            };
            
            // Aggiungi owner_points e opponent_points per comodità
            results.forEach(result => {
              if (result.userId == ownerId) {
                response.owner_team_id = result.teamId;
                response.owner_points = result.points;
              } else if (result.userId == opponentId) {
                response.opponent_team_id = result.teamId;
                response.opponent_points = result.points;
              }
            });
            
            resolve(response);
          })
          .catch(err => {
            console.error('Errore nel calcolo dei punti:', err);
            reject(err);
          });
      });
    });
  });
}

/**
 * Endpoint per ottenere i punti di un fantasy team
 * GET /fantasy-points?team_id=X
 */
router.get('/fantasy-points', (req, res) => {
  const teamId = req.query.team_id;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Parametro team_id mancante' });
  }
  
  calculateFantasyTeamPoints(teamId)
    .then(points => {
      res.json({ 
        fantasy_team_id: teamId,
        total_points: points
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Errore nel calcolo dei punti' });
    });
});

/**
 * Endpoint per ottenere i punti di un contest
 * GET /contest-points?contest_id=X
 */
router.get('/fantasy/contest-points', (req, res) => {
  const contestId = req.query.contest_id;
  
  if (!contestId) {
    return res.status(400).json({ error: 'Parametro contest_id mancante' });
  }
  
  calculateContestPoints(contestId)
    .then(data => {
      res.json(data);
    })
    .catch(err => {
      console.error('Errore nell\'elaborazione della richiesta:', err);
      res.status(500).json({ error: 'Errore nel calcolo dei punti del contest' });
    });
});

/**
 * Endpoint per aggiornare i punti di un fantasy team nel database
 * POST /update-fantasy-points
 * Body: { team_id: X }
 */
router.post('/update-fantasy-points', (req, res) => {
  const teamId = req.body.team_id;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Parametro team_id mancante' });
  }
  
  calculateFantasyTeamPoints(teamId)
    .then(points => {
      // Aggiorna il punteggio nel database
      const updateQuery = `
        UPDATE fantasy_teams 
        SET total_points = ?, updated_at = NOW()
        WHERE fantasy_team_id = ?
      `;
      
      pool.query(updateQuery, [points, teamId], (err, result) => {
        if (err) {
          console.error('Errore nell\'aggiornamento dei punti:', err);
          return res.status(500).json({ error: 'Errore nell\'aggiornamento dei punti' });
        }
        
        res.json({ 
          fantasy_team_id: teamId,
          total_points: points,
          updated: true
        });
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Errore nel calcolo dei punti' });
    });
});

module.exports = router;
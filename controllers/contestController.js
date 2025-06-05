// controllers/contestController.js

const { getContestDetails, confirmSquad } = require('../services/contestService');

async function contestDetailsController(req, res) {
  try {
    let { contest_id, owner_id, opponent_id, event_unit_id } = req.body;
   // Se opponent_id è 0, traduciamolo in null per non rompere le query JOIN
     opponent_id = parseInt(opponent_id, 10);
  if (isNaN(opponent_id)) {
    opponent_id = null;
  }
    const currentUserId = req.user.userId;

      // Non servono più validazioni stringenti, perché sappiamo che
      // select-competitors ha già passato opponent_id e event_unit_id ≥ 1
      const data = await getContestDetails({
        contestId:     parseInt(contest_id,    10),
        ownerId:       parseInt(owner_id,      10),
        opponentId:    parseInt(opponent_id,   10),
        eventUnitId: null,   // non facciamo più “WHERE event_unit_id = ?”
        currentUserId
      });

    return res.json(data);
  } catch (err) {
    console.error('Errore in contestDetailsController:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
}

async function confirmSquadController(req, res) {
  try {
    const { contestId, players, multiplier, totalCost } = req.body;
    const userId = req.user.userId;
    const result = await confirmSquad({ contestId, userId, players, multiplier, totalCost });
    return res.json(result);
  } catch (err) {
    console.error('Errore in confirmSquadController:', err);
    const status = err.message === 'Saldo Teex insufficiente' ? 400 : 500;
    return res.status(status).json({ error: err.message || 'Errore interno del server' });
  }
}

module.exports = {
  contestDetailsController,
  confirmSquadController
};

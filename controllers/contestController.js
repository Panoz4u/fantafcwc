// controllers/contestController.js

const { getContestDetails, confirmSquad } = require('../services/contestService');

async function contestDetailsController(req, res) {
  try {
    const { contest_id, owner_id, opponent_id, event_unit_id } = req.body;
    const currentUserId = req.user.userId;

    const data = await getContestDetails({
      contestId:     parseInt(contest_id,    10),
      ownerId:       parseInt(owner_id,      10),
      opponentId:    parseInt(opponent_id,   10),
      eventUnitId:   parseInt(event_unit_id, 10),
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

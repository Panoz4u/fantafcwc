// controllers/contestController.js

const { getContestDetails, confirmSquad } = require('../services/contestService');

async function contestDetailsController(req, res) {
  try {
    const { contest_id, owner_id, opponent_id, event_unit_id } = req.body;
    const currentUserId = req.user.userId;

    const parsedEventUnitId = parseInt(event_unit_id, 10);

    if (isNaN(parsedEventUnitId)) {
      console.error('Errore in contestDetailsController: event_unit_id is not a valid number', event_unit_id);
      return res.status(400).json({ error: 'Invalid event_unit_id provided.' });
    }

    const data = await getContestDetails({
      contestId:     parseInt(contest_id,    10),
      ownerId:       parseInt(owner_id,      10),
      opponentId:    parseInt(opponent_id,   10),
      eventUnitId:   parsedEventUnitId, // Use the validated and parsed event_unit_id
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

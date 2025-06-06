// backend/controllers/leagueDetailsController.js

const { fetchLeagueDetails } = require('../services/leagueDetailsService');

async function getLeagueDetails(req, res) {
console.log("🔎 [SERVER DEBUG] body.post:", req.body);
console.log("🔎 [SERVER DEBUG] contest_id =", pid,
            "owner_id =", pOwner,
            "opponent_id =", pOpponent,
            "event_unit_id =", pEventUnit);
  try {
    console.log('[leagueDetailsController] req.body =', req.body);
    const { contest_id } = req.body;
    const currentUserId = req.user.userId; // viene dal token JWT
    console.log('[leagueDetailsController] contest_id =', contest_id, 'currentUserId =', currentUserId);
    const data = await fetchLeagueDetails({ contest_id, currentUserId });
    return res.json(data);
  } catch (error) {
    console.error('Errore in getLeagueDetails:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

module.exports = { getLeagueDetails };

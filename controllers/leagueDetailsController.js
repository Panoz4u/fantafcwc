// backend/controllers/leagueDetailsController.js

const { fetchLeagueDetails } = require('../services/leagueDetailsService');

async function getLeagueDetails(req, res) {

  try {
  
    const { contest_id } = req.body;
    const currentUserId = req.user.userId; // viene dal token JWT
    const data = await fetchLeagueDetails({ contest_id, currentUserId });
    return res.json(data);
  } catch (error) {
    console.error('Errore in getLeagueDetails:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

module.exports = { getLeagueDetails };

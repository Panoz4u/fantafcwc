// controllers/userContestsController.js
const { getUserContests } = require('../services/userContests');

async function list(req, res) {
  try {
    const userId = req.user.userId;        // viene dalla verifyToken middleware
    const contests = await getUserContests(userId);
    res.json({ contests });
  } catch (err) {
    console.error('userContestsController.list:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

module.exports = { list };


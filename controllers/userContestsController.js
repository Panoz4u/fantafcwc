// controllers/userContestsController.js
const { getUserContests, getContestById } = require('../services/userContests');

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

async function getById(req, res) {
  try {
    const contestId = parseInt(req.params.contestId, 10);
    const userId = req.user.userId;        // viene dalla verifyToken middleware
    
    if (isNaN(contestId)) {
      return res.status(400).json({ error: 'ID contest non valido' });
    }
    
    const data = await getContestById(contestId, userId);
    res.json(data);
  } catch (err) {
    console.error('userContestsController.getById:', err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

module.exports = { list, getById };


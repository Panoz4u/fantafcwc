// routes/leagueRoutes.js
// —————————————————————————————————————————————————————————————————————————
// Qui colleghiamo i due metodi del controller alle URL
// Le mettiamo sotto /api/leagues/…
// —————————————————————————————————————————————————————————————————————————

const express = require('express');
const router  = express.Router();
const leagueController = require('../controllers/leagueController');
const authenticateToken = require('../middleware/auth');
// 1) GET lista di possibili competitor per Private League
router.get('/competitors', authenticateToken, leagueController.getCompetitors);

// 2) POST crea la nuova private league
router.post('/', authenticateToken, leagueController.createLeague);

module.exports = router;

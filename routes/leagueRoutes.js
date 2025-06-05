// routes/leagueRoutes.js

const express            = require('express');
const router             = express.Router();
const leagueController   = require('../controllers/leagueController');
const authenticateToken  = require('../middleware/auth'); // middleware JWT o simile

// ------------------------------------------------------------------
// 1) GET /api/leagues/competitors
//    → Restituisce lista dei possibili competitor (tutti tranne owner).
//    Il controller chiama service.getPossibleCompetitors(ownerId).
// ------------------------------------------------------------------
router.get(
  '/competitors',
  authenticateToken,
  leagueController.getCompetitors
);

// ------------------------------------------------------------------
// 2) POST /api/leagues
//    → Crea nuovo contest (tipo 2 = Private League), inserisce owner e
//       competitorIds in fantasy_teams, restituisce { contestId }.
// ------------------------------------------------------------------
router.post(
  '/',
  authenticateToken,
  leagueController.createLeague
);

module.exports = router;

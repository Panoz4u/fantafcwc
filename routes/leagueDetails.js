// backend/routes/leagueDetails.js

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { getLeagueDetails } = require('../controllers/leagueDetailsController');

// La rotta è definita come POST su "/details"
router.post('/details', authenticateToken, getLeagueDetails);

module.exports = router;

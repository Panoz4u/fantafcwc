// routes/athletes.js
const express = require('express');
const router  = express.Router();
const { allActive, byEvent, aepEventUnit } = require('../controllers/athleteController');

// GET /api/all-active-athletes
router.get('/all-active-athletes', allActive);

// GET /api/event-players?event_unit_id=…
router.get('/event-players',       byEvent);

// GET /api/aep-event-unit?aep_id=…
router.get('/aep-event-unit',      aepEventUnit);

module.exports = router;
const express = require('express');
const router  = express.Router();
const userContestsController = require('../controllers/userContestsController');
const authenticateToken = require('../middleware/auth');



// GET /api/user-contests
router.get('/', authenticateToken, userContestsController.list);

// GET /api/user-contests/:contestId
router.get('/:contestId', authenticateToken, userContestsController.getById);

module.exports = router;

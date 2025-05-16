// routes/auth.js
const express = require('express');
const router  = express.Router();
const {
  generateToken,
  verifyToken
} = require('../controllers/authController');

// POST /generate-token
router.post('/generate-token', generateToken);

// POST /verify-token
router.post('/verify-token', verifyToken);

module.exports = router;

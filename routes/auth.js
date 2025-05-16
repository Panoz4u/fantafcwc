// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  generateToken,
  verifyToken,
} = require('../controllers/authController');

// genera un token JWT da { userId }
router.post('/generate-token', generateToken);

// verifica che il token sia valido per { userId }
router.post('/verify-token', verifyToken);

module.exports = router;

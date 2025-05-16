// controllers/authController.js
const authService = require('../services/authService');

/**
 * Genera un JWT per { userId }.
 * POST /generate-token
 */
async function generateToken(req, res, next) {
  try {
    const { token } = await authService.generateToken(req.body);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

/**
 * Verifica che { token, userId } combacino.
 * POST /verify-token
 */

async function verifyToken(req, res, next) {
  try {
    // Chiamo il service che mi restituisce un booleano
    const valid = await authService.verifyToken(req.body);
    // Ora mando al client un oggetto con la proprietà valid
    return res.json({ valid });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateToken, verifyToken };


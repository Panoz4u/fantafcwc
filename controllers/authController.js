// controllers/authController.js
const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const token = await authService.login(req.body);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

async function verifyToken(req, res, next) {
  try {
    const valid = await authService.verifyToken(req.body);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verifyToken };

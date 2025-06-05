// controllers/leagueController.js

const jwt = require('jsonwebtoken');
const { getPossibleCompetitors, createPrivateLeague } = require('../services/leagueService');
const { JWT_SECRET } = process.env;

/**
 * Estrae l'userId dal token JWT (o lancia errore se non valido).
 */
function extractUserIdFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) throw new Error('Token mancante');
  const payload = jwt.verify(token, JWT_SECRET);
  return payload.userId; // assumiamo che il payload contenga esattamente “userId”
}

/**
 * GET /api/leagues/competitors
 * Restituisce la lista dei possibili competitor (tutti gli utenti eccetto l’owner).
 */
async function getCompetitors(req, res) {
  try {
    const userId = extractUserIdFromToken(req);
    const users = await getPossibleCompetitors(userId);
    res.json({ users });
  } catch (err) {
    console.error('leagueController.getCompetitors error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token non valido' });
    }
    res.status(500).json({ error: 'Errore interno: ' + err.message });
  }
}

/**
 * POST /api/leagues
 * Body: { leagueName: string, competitorIds: number[] }
 *
 * Crea un nuovo contest di tipo “Private League” e inserisce owner + competitorIds
 * nella tabella fantasy_teams. Restituisce { contestId: … }.
 */
async function createLeague(req, res) {
  try {
    const userId = extractUserIdFromToken(req);
    const { leagueName, competitorIds } = req.body;

    if (!leagueName || typeof leagueName !== 'string') {
      return res.status(400).json({ error: 'League name is required' });
    }
    if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
      return res.status(400).json({ error: 'At least one competitor is required' });
    }
    if (competitorIds.length > 9) {
      return res.status(400).json({ error: 'Maximum 9 competitors allowed' });
    }

    // Creazione contest + inserimento in fantasy_teams
    const newContestId = await createPrivateLeague(userId, leagueName, competitorIds);

    // Ritorniamo solo contestId, perché non esiste più “leagueId”
    res.status(201).json({ contestId: newContestId });

  } catch (err) {
    console.error('leagueController.createLeague error:', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Errore interno: ' + err.message });
  }
}

module.exports = {
  getCompetitors,
  createLeague
};

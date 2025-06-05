// controllers/leagueController.js
// —————————————————————————————————————————————————————————————————————————
// Questo controller espone due funzioni principali:
//  1) getCompetitors: ritorna tutti gli utenti tranne chi chiama
//  2) createLeague: crea effettivamente una “private league”
// —————————————————————————————————————————————————————————————————————————

const jwt = require('jsonwebtoken');
const { getPossibleCompetitors, createPrivateLeague } = require('../services/leagueService');
const { JWT_SECRET } = process.env; // o da config

/**
 * Middleware di utilità per leggere il token e ottenere il userId.
 * (Puoi anche riusare authenticateToken già presente, ma
 * per scrivere meno, verifichiamo il Bearer token qui.)
 */
function extractUserIdFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) throw new Error('Token mancante');
  const payload = jwt.verify(token, JWT_SECRET);
  return payload.userId; // supponiamo che payload contenga “userId”
}

/**
 * GET /api/leagues/competitors
 * Restituisce la lista di possibili competitor per la Private League,
 * quindi semplicemente “getPossibleCompetitors(ownerUserId)”
 */
async function getCompetitors(req, res) {
  try {
    const userId = extractUserIdFromToken(req);
    const users = await getPossibleCompetitors(userId);
    res.json({ users });
  } catch (err) {
    console.error('leagueController.getCompetitors error:', err);
    res.status(401).json({ error: err.message || 'Non autorizzato' });
  }
}

/**
 * POST /api/leagues
 * Body: { leagueName: string, competitorIds: number[] }
 *
 * Crea la nuova private league e inserisce owner + competitorIds.
 * Restituisce { leagueId: … }.
 */
async function createLeague(req, res) {
  try {
    const userId = extractUserIdFromToken(req);
    const { leagueName, competitorIds } = req.body;

    if (!leagueName || typeof leagueName !== 'string') {
      return res.status(400).json({ error: 'Nome lega mancante o non valido' });
    }
    if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
      return res.status(400).json({ error: 'Devi selezionare almeno un competitor' });
    }
    if (competitorIds.length > 9) {
      return res.status(400).json({ error: 'Puoi invitare al massimo 9 competitor' });
    }

    // Creazione effettiva della private league
    const leagueId = await createPrivateLeague(userId, leagueName, competitorIds);
    res.status(201).json({ leagueId });
  } catch (err) {
    console.error('leagueController.createLeague error:', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
    res.status(500).json({ error: 'Errore interno del server: ' + err.message });
  }
}

module.exports = {
  getCompetitors,
  createLeague
};

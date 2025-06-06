// controllers/leagueController.js

const jwt                        = require('jsonwebtoken');
const {
  getPossibleCompetitors,
  createPrivateLeague,
  rejectFantasyTeam
} = require('../services/leagueService');

const { JWT_SECRET }             = process.env;

/**
 * Estrae l'userId dal token JWT (o lancia errore se non valido).
 * Si assume che il payload contenga `{ userId: <numero> }`.
 */
function extractUserIdFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Token mancante o non valido');
    err.name = 'TokenError';
    throw err;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.userId) {
      const err = new Error('Payload token privo di userId');
      err.name = 'TokenError';
      throw err;
    }
    return payload.userId;
  } catch (error) {
    // Rilancio l’errore per essere gestito in catch delle funzioni chiamanti
    error.name = 'TokenError';
    throw error;
  }
}

/**
 * GET /api/leagues/competitors
 * → Restituisce la lista di possibili competitor (tutti gli utenti eccetto owner).
 */
async function getCompetitors(req, res) {
  try {
    // 1) Estrae ownerId dal token
    const ownerId = extractUserIdFromToken(req);

    // 2) Chiamo il service per ottenere gli user (esclude l’owner)
    const users = await getPossibleCompetitors(ownerId);
    // Restituisco un oggetto { users: [...] }
    return res.status(200).json({ users });
  } catch (err) {
    console.error('leagueController.getCompetitors error:', err);

    if (err.name === 'TokenError' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
    return res.status(500).json({ error: 'Errore interno: ' + err.message });
  }
}

/**
 * POST /api/leagues
 * Body JSON expected: {
 *   leagueName: string,
 *   competitorIds: number[]
 * }
 *
 * → Crea un nuovo contest di tipo “Private League” (contest_type = 2),
 *    quindi inserisce owner + competitorIds in `fantasy_teams`.
 *    Restituisce JSON { contestId: <nuovoId> }.
 */
async function createLeague(req, res) {
  try {
    // 1) Estrae ownerId dal token
    const ownerId = extractUserIdFromToken(req);

    // 2) Prendo i dati dal body
    const { leagueName, competitorIds } = req.body;

    // 3) Validazione di base
    if (!leagueName || typeof leagueName !== 'string' || leagueName.trim().length === 0) {
      return res.status(400).json({ error: 'League name è obbligatorio e deve essere una stringa non vuota.' });
    }
    if (!Array.isArray(competitorIds)) {
      return res.status(400).json({ error: 'competitorIds è obbligatorio e deve essere un array di ID (numeri).' });
    }
    if (competitorIds.length === 0) {
      return res.status(400).json({ error: 'Devi selezionare almeno un competitor.' });
    }
    if (competitorIds.length > 9) {
      return res.status(400).json({ error: 'Non puoi invitare più di 9 competitor.' });
    }

    // 4) Escludo duplicati e tolgo l’owner dall’elenco dei competitor (se presente)
    const uniqueIds = Array.from(
      new Set(
        competitorIds
          .map(id => Number(id))
          .filter(id => id !== ownerId && !isNaN(id))
      )
    );

    // 5) Chiamo il service per creare la party league (contests + fantasy_teams)
    const newContestId = await createPrivateLeague(ownerId, leagueName.trim(), uniqueIds);

    // 6) Restituisco al client solo { contestId: … }
    return res.status(201).json({ contestId: newContestId });
  } catch (err) {
    console.error('leagueController.createLeague error:', err);

    if (err.name === 'TokenError' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
    return res.status(500).json({ error: 'Errore interno: ' + err.message });
  }
}

/**
 * PUT /api/leagues/:contestId/:userId/status
 * Imposta ft_status a -1 per il fantasy team indicato.
 */
async function updateFantasyTeamStatus(req, res) {
  try {
    const contestId = parseInt(req.params.contestId, 10);
    const userId = parseInt(req.params.userId, 10);
    const { status } = req.body;

    if (Number.isNaN(contestId) || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Parametri non validi' });
    }

    if (status !== -1) {
      return res.status(400).json({ error: 'Status non supportato' });
    }

    await rejectFantasyTeam(contestId, userId);
    return res.json({ message: 'Status aggiornato' });
  } catch (err) {
    console.error('leagueController.updateFantasyTeamStatus:', err);
    return res.status(500).json({ error: 'Errore interno' });
  }
}

module.exports = {
  getCompetitors,
  createLeague,
  updateFantasyTeamStatus
};

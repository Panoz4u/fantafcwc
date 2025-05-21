// controllers/contestController.js

// Importa il servizio che abbiamo già definito
const { confirmSquad } = require('../services/contestService');

async function confirmSquadController(req, res) {
  try {
    // prendi dal body i dati che ti servono
    const { contestId, players, multiplier, totalCost } = req.body;
    // l'ID utente autenticato arriva da req.user (middleware JWT)
    const userId = req.user.userId;

    // chiama il service che fa tutta la logica DB
    const result = await confirmSquad({ contestId, userId, players, multiplier, totalCost });

    // rispondi con il risultato
    return res.json(result);
  } catch (err) {
    console.error('Errore in confirmSquadController:', err);
    return res
      .status(err.message === 'Saldo Teex insufficiente' ? 400 : 500)
      .json({ error: err.message || 'Errore interno del server' });
  }
}

module.exports = { confirmSquadController };

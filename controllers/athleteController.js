const {
    getAllActiveAthletes,
    getEventPlayers,
    getAepEventUnit
  } = require('../services/athleteService');
  
  async function allActive(req, res) {
    try {
      const athletes = await getAllActiveAthletes();
      return res.json(athletes);
    } catch (err) {
      console.error('Errore allActive:', err);
      return res.status(500).json({ error: err.message });
    }
  }
  
  async function byEvent(req, res) {
    const eventUnitId = req.query.event_unit_id;
    try {
      const rows = await getEventPlayers(eventUnitId);
      return res.json(rows);
    } catch (err) {
      console.error('Errore byEvent:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  
  async function aepEventUnit(req, res) {
    const aepId = req.query.aep_id;
    try {
      const data = await getAepEventUnit(aepId);
      return res.json(data);
    } catch (err) {
      console.error('Errore aepEventUnit:', err);
      return res.status(err.message === 'Missing aep_id' ? 400 : 404).json({ error: err.message });
    }
  }
  
  module.exports = { allActive, byEvent, aepEventUnit };
  
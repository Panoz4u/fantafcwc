const express = require('express');
const router  = express.Router();
const { contestDetailsController, confirmSquadController }
  = require('../controllers/contestController');
const authenticateToken = require('../middleware/auth');
const pool = require('../services/db');

router.post('/contest-details', authenticateToken, contestDetailsController);
router.post('/confirm-squad',   authenticateToken, confirmSquadController);
router.post(
    '/', 
    authenticateToken, 
    async (req, res) => {
      const { owner, opponent, event_unit_id, multiply } = req.body;
      if (!owner || !opponent) 
        return res.status(400).json({ error:"Owner or Opponent missing" });
  
      const sql = `
        INSERT INTO contests 
          (owner_user_id, opponent_user_id, contest_type, stake, status, created_at, updated_at, event_unit_id, multiply)
        VALUES (?,?,?,?,0,NOW(),NOW(),?,?)
      `;
      // default multiply = 1
      const mult = multiply || 1;
      pool.query(sql, [owner, opponent, 'head_to_head', 0, event_unit_id, mult], (er, rs) => {
        if (er) {
          console.error("Error creating contest", er);
          return res.status(500).json({ error:"DB error creating contest" });
        }
        // restituisci l’ID generato
        res.json({ contestId: rs.insertId });
      });
    }
  );
module.exports = router;
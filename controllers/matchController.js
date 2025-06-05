const pool = require('../services/db');

async function createNewMatch(match) {
  const fields = Object.keys(match).filter(key => match[key] !== undefined);
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(field => match[field]);

  const insertQuery = `
    INSERT INTO matches (${fields.join(', ')})
    VALUES (${placeholders})
  `;

  return new Promise((resolve, reject) => {
    pool.query(insertQuery, values, (err, queryResult) => {
      if (err) {
        reject(err);
      } else {
        resolve(queryResult.insertId);
      }
    });
  });
}

async function uploadMatches(req, res) {
  const { matches } = req.body;

  if (!matches || !Array.isArray(matches)) {
    return res.status(400).json({ message: 'Formato dati non valido.' });
  }

  const result = {
    created: 0,
    updated: 0,
    errors: []
  };

  try {
    for (const match of matches) {
      try {
        if (match.match_id) {
          const updateFields = {};
          const allowedFields = [
            'event_unit_id',
            'home_team',
            'away_team',
            'home_score',
            'away_score',
            'status',
            'match_date',
            'updated_at'
          ];

          allowedFields.forEach(field => {
            if (match[field] !== undefined) {
              updateFields[field] = match[field];
            }
          });

          if (Object.keys(updateFields).length > 0) {
            const updateQuery = `
              UPDATE matches
              SET ${Object.keys(updateFields).map(field => `${field} = ?`).join(', ')}
              WHERE match_id = ?
            `;
            const updateValues = [...Object.values(updateFields), match.match_id];

            await new Promise((resolve, reject) => {
              pool.query(updateQuery, updateValues, (err, queryResult) => {
                if (err) {
                  reject(err);
                } else if (queryResult.affectedRows > 0) {
                  result.updated++;
                  resolve();
                } else {
                  createNewMatch(match)
                    .then(() => {
                      result.created++;
                      resolve();
                    })
                    .catch(reject);
                }
              });
            });
          }
        } else {
          await createNewMatch(match);
          result.created++;
        }
      } catch (matchError) {
        console.error('Error processing match:', matchError);
        result.errors.push(`Errore per il match ${match.match_id || 'nuovo'}: ${matchError.message}`);
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Errore durante l'elaborazione dell'upload:", error);
    res.status(500).json({ message: "Errore durante l'elaborazione dell'upload.", errors: [error.message] });
  }
}

async function updatePastMatches(req, res) {
  try {
    const updateQuery = `
      UPDATE matches
      SET status = 4, updated_at = NOW()
      WHERE match_date < NOW() AND status < 4
    `;

    pool.query(updateQuery, (err, result) => {
      if (err) {
        console.error("Errore nell'aggiornamento dei match passati:", err);
        return res.status(500).json({ error: 'DB error updating past matches' });
      }

      res.json({ message: 'Past matches updated successfully', updatedCount: result.affectedRows });
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento dei match passati:", error);
    res.status(500).json({ message: "Errore durante l'aggiornamento dei match passati.", error: error.message });
  }
}

module.exports = { uploadMatches, updatePastMatches };
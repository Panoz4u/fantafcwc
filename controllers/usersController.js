// controllers/usersController.js
const userService = require('../services/userService');

/**
 * GET /users
 * Invia al client la lista di utenti.
 */
async function getAll(req, res, next) {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (err) {
    next(err);  // passerà al middleware di errore in index.js
  }
}

/**
 * GET /users/:id
 * Restituisce l'utente con user_id = req.params.id
 */
async function getById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
  
 /**
 * GET /user-by-email?email=...
 */
async function getByEmail(req, res, next) {
    try {
      const email = req.query.email;
      if (!email) return res.status(400).json({ error: 'Manca email' });
      const user = await userService.findByEmail(email);
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  } 


/**
 * GET /user-landing-info
 * (protetto: deve venir chiamato con Authorization: Bearer <token>)
 */
async function landingInfo(req, res, next) {
  try {
    const user = await userService.getLandingInfo(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    // Restituisco SOLO user
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}


/**
 * POST /users
 * Crea un nuovo utente, risponde { id }
 */
async function create(req, res, next) {
    try {
        // result.id contiene il nuovo ID
        const { id } = await userService.create(req.body);
         // mando al client { userId: id }
        res.status(201).json({ userId: id });
    } catch (err) {
      next(err);
    }
  }

/**
 * PUT /users/:id
 * Richiama userService.update(id, body) e restituisce l’utente aggiornato.
 */
async function update(req, res, next) {
    try {
      const updated = await userService.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Utente non trovato' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

/**
 * DELETE /users/:id
 * Cancella l’utente e risponde 204 No Content.
 */
async function remove(req, res, next) {
    try {
      await userService.remove(req.params.id);
      // 204 = nessun contenuto da restituire
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }



  module.exports = {
    getAll,
    getById,
    getByEmail,
    landingInfo,
    create,
    update,
    remove
  };
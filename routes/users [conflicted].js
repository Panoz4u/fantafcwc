// routes/users.js
const express = require('express');
const router  = express.Router();
const { getAll, create, getById, update, remove } = require('../controllers/usersController');

// IMPORTA il tuo controller UTENTI
const usersController = require('../controllers/usersController');

// READ ALL  → GET /users
router.get('/users', usersController.getAll);

// GET /users/:id
router.get('/users/:id', usersController.getById);

// GET /user-by-email
router.get('/user-by-email', usersController.getByEmail);

// POST /users
router.post('/users', create);

// PUT /users/:id
router.put('/users/:id', usersController.update);

// DELETE /users/:id
router.delete('/users/:id', usersController.remove);


module.exports = router;

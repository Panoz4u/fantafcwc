// routes/users.js
const express = require('express');
const router  = express.Router();
const usersController = require('../controllers/usersController');

// GET  /users
router.get('/users', usersController.getAll);

// GET  /users/:id
router.get('/users/:id', usersController.getById);

// POST /users
router.post('/users', usersController.create);

// PUT  /users/:id
router.put('/users/:id', usersController.update);

// DELETE /users/:id
router.delete('/users/:id', usersController.remove);

module.exports = router;

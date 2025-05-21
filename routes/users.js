// routes/users.js
const express = require('express');
const router  = express.Router();

// Import corretto: è la funzione middleware
const authenticateToken = require('../middleware/auth');
const usersController   = require('../controllers/usersController');

// → GET /users
router.get('/', authenticateToken, usersController.getAll);

// → GET /users/except
router.get('/except', authenticateToken, usersController.getAllExceptCurrent);

// → GET /users/:id
router.get('/:id', usersController.getById);

// → GET /user-by-email
router.get('/by-email', usersController.getByEmail);

// → GET /user-landing-info (protetta)
router.get('/landing-info', authenticateToken, usersController.landingInfo);

// → POST /users
router.post('/', usersController.create);   
       // ← usa usersController.create, non “create”!
// → PUT /users/:id
router.put('/:id', usersController.update);
// → DELETE /users/:id
router.delete('/:id', usersController.remove);



module.exports = router;

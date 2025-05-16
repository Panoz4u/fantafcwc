// routes/users.js
const express = require('express');
const router  = express.Router();

// Import corretto: è la funzione middleware
const authenticateToken = require('../middleware/auth');
const usersController   = require('../controllers/usersController');

// → GET /users
router.get('/users', authenticateToken, usersController.getAll);

// → GET /users/:id
router.get('/users/:id', usersController.getById);

// → GET /user-by-email
router.get('/user-by-email', usersController.getByEmail);

// → GET /user-landing-info (protetta)
 router.get('/user-landing-info', authenticateToken, usersController.landingInfo);

// → POST /users
router.post('/users', usersController.create);   
       // ← usa usersController.create, non “create”!
// → PUT /users/:id
router.put('/users/:id', usersController.update);
// → DELETE /users/:id
router.delete('/users/:id', usersController.remove);



module.exports = router;

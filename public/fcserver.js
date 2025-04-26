const express = require('express');
const router = express.Router();

// Define your routes
router.get('/', (req, res) => {
  res.send('FCServer route is working!');
});

// Add other routes as needed
// router.get('/something', (req, res) => { ... });
// router.post('/something-else', (req, res) => { ... });

module.exports = router;  // Export the router, not an object of routes
const jwt = require('jsonwebtoken');

// Chiave segreta per i JWT (meglio metterla in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'chiave_segreta_molto_sicura';

// Middleware per verificare il token JWT
const authenticateToken = (req, res, next) => {
  // Ottieni il token dall'header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: "Token di autenticazione mancante" });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token non valido o scaduto" });
    }
    
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken,
  JWT_SECRET
};
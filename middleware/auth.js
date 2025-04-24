const jwt = require('jsonwebtoken');

// Chiave segreta per firmare i token JWT (dovresti metterla in un file .env)
const JWT_SECRET = process.env.JWT_SECRET || 'chiave_segreta_temporanea';

// Genera un token JWT per l'utente
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.user_id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verifica il token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Accesso negato. Token mancante.' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token non valido' });
  }
};

module.exports = { generateToken, verifyToken };
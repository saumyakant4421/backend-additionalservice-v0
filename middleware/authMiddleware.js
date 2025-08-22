const admin = require('firebase-admin');
require('../config/firebase'); // Ensure Firebase is initialized

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header:', authHeader);
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  console.log('Received token:', idToken.substring(0, 10) + '...');

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Token verified for user:', decodedToken.uid);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);
    res.status(401).json({ error: `Invalid token: ${error.message}` });
  }
};

module.exports = { authMiddleware };
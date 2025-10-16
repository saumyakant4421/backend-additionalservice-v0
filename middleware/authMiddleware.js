const admin = require('firebase-admin');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header:', authHeader);
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  console.log('Received token:', idToken.substring(0, 10) + '...');

  // Ensure Firebase admin is initialized before calling auth APIs
  if (!Array.isArray(admin.apps) || admin.apps.length === 0) {
    console.error('Firebase admin SDK not initialized when authMiddleware was called');
    return res.status(503).json({ error: 'Service Unavailable: Authentication service not initialized' });
  }

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
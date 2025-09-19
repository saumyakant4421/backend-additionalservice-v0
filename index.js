
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const watchPartyRoutes = require('./routes/watchPartyRoutes'); 
const marathonRoutes = require('./routes/marathonRoutes');

dotenv.config();

const client = new SecretManagerServiceClient();

// Async function to load Firebase service account
async function loadFirebaseServiceAccount() {
  try {
    const [version] = await client.accessSecretVersion({
      name: 'projects/streamverse-movie-12345/secrets/firebase-service-account/versions/latest', // Replace Project ID
    });
    return JSON.parse(version.payload.data.toString('utf8'));
  } catch (error) {
    console.error('Error loading Firebase secret:', error);
    process.exit(1);
  }
}

// Initialize app async
async function initApp() {
  try {
    // Initialize Firebase
    const serviceAccount = await loadFirebaseServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase initialized');

    const app = express();

    app.use(cors());
    app.use(express.json());

    // Add a root route for service status (after app is initialized)
    app.get('/', (req, res) => {
      res.status(200).json({ message: 'Additional Service is up and running' });
    });

    // Mount the router
    app.use('/api/tools/watchparty', watchPartyRoutes);
    app.use('/api/tools/marathon', marathonRoutes);

    // Catch-all 404 handler
    app.use((req, res) => {
      console.log(`Route not found: ${req.method} ${req.url}`); // Debug log
      res.status(404).json({ error: `Route ${req.url} not found` });
    });

    const PORT = process.env.PORT || 4004;
    app.listen(PORT, () => console.log(`Additional Service running on port ${PORT}`));

    process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
    process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

initApp();
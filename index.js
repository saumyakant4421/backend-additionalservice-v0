
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fs = require('fs');
const path = require('path');
// Note: routes will be required after Firebase initialization so modules which
// access Firestore / admin SDK are not loaded before admin.initializeApp() is called.

dotenv.config();

const client = new SecretManagerServiceClient();

// Async function to load Firebase service account
// Async function to load Firebase service account
async function loadFirebaseServiceAccount() {
  // Prefer explicit local/env credentials to avoid calling Secret Manager when not needed.
  // 1) FIREBASE_SERVICE_ACCOUNT env var (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      console.log('Using FIREBASE_SERVICE_ACCOUNT from environment');
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (envErr) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', envErr);
      // continue to other fallbacks
    }
  }

  // 2) GOOGLE_APPLICATION_CREDENTIALS file (explicit ADC file)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const gaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    try {
      if (fs.existsSync(gaPath)) {
        console.log(`Using GOOGLE_APPLICATION_CREDENTIALS file at ${gaPath} as service account`);
        const raw = fs.readFileSync(gaPath, 'utf8');
        return JSON.parse(raw);
      } else {
        console.warn(`GOOGLE_APPLICATION_CREDENTIALS is set but file does not exist at ${gaPath}`);
      }
    } catch (gaErr) {
      console.error('Failed to read/parse GOOGLE_APPLICATION_CREDENTIALS file:', gaErr);
    }
  }

  // 3) Local firebase-adminsdk.json file (development fallback)
  const localPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'firebase-adminsdk.json');
  if (fs.existsSync(localPath)) {
    try {
      console.log(`Falling back to local Firebase service account at ${localPath}`);
      const raw = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(raw);
    } catch (fsErr) {
      console.error('Failed to read local Firebase service account file:', fsErr);
      // continue to Secret Manager attempt
    }
  }

  // If caller explicitly set SKIP_SECRET_MANAGER, do not attempt Secret Manager.
  if (process.env.SKIP_SECRET_MANAGER === 'true') {
    const err = new Error('Secret Manager access skipped by SKIP_SECRET_MANAGER=true and no local credentials available.');
    console.error(err.message);
    throw err;
  }

  // Finally, try Secret Manager (this is the default for deployed environments).
  try {
    const [version] = await client.accessSecretVersion({
      name: 'projects/streamverse-movie-12345/secrets/firebase-service-account/versions/latest',
    });
    return JSON.parse(version.payload.data.toString('utf8'));
  } catch (error) {
    // Log the Secret Manager error (full object) and attempt a local fallback for development
    console.error('Error loading Firebase secret (full error):', error);

    // As a last resort, re-check localPath (in case of race or permissions)
    if (fs.existsSync(localPath)) {
      try {
        console.log(`Using local Firebase service account at ${localPath} after Secret Manager failed`);
        const raw = fs.readFileSync(localPath, 'utf8');
        return JSON.parse(raw);
      } catch (fsErr) {
        console.error('Failed to read local Firebase service account file after Secret Manager error:', fsErr);
      }
    } else {
      console.warn(`No local Firebase service account found at ${localPath} after Secret Manager error`);
    }

    const err = new Error('No Firebase credentials available (Secret Manager failed and no local file).');
    console.error(err.message);
    throw err; // let initApp handle shutdown
  }
}

// Initialize app async
async function initApp() {
  try {
    // Initialize Firebase
    const serviceAccount = await loadFirebaseServiceAccount();
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase initialized');
    } catch (initErr) {
      console.error('Failed to initialize Firebase app:', initErr && initErr.message ? initErr.message : initErr);
      throw initErr;
    }


  const app = express();

    app.use(cors());
    app.use(express.json());

    // Add a root route for service status (after app is initialized)
    app.get('/', (req, res) => {
      res.status(200).json({ message: 'Additional Service is up and running' });
    });

    // Require routes after Firebase is initialized so services using
    // the admin SDK (via config/firebase) don't run before initialization.
    const watchPartyRoutes = require('./routes/watchPartyRoutes');
    const marathonRoutes = require('./routes/marathonRoutes');

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
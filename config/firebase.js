// config/firebase.js
const admin = require('firebase-admin');

// Firebase will be initialized in index.js using Secret Manager
// Export a function that returns the Firestore instance at runtime.
// Do NOT call admin.firestore() at module-load time to avoid throwing the
// firebase-admin `NO_APP` error when the default app hasn't been initialized yet.
function getDb() {
	// Check whether an app has been initialized. Accessing admin.firestore()
	// when no app exists throws a FirebaseAppError; avoid calling it here.
	if (!Array.isArray(admin.apps) || admin.apps.length === 0) {
		throw new Error('Firebase has not been initialized. Call admin.initializeApp() before using Firestore.');
	}
	return admin.firestore();
}

// Export helpers explicitly. Consumers should call getDb() at runtime (after
// index.js calls admin.initializeApp()). This avoids accidental evaluation
// during module import time.
module.exports = {
	getDb,
};
// config/firebase.js
const admin = require('firebase-admin');

// Firebase will be initialized in index.js using Secret Manager
// This module just provides access to the Firestore database
const db = admin.firestore();

module.exports = { db };
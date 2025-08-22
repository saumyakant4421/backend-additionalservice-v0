const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const axios = require('axios');
const dotenv = require('dotenv');
const sodium = require('sodium-native');

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const getMovieDetails = async (movieId) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
      params: { api_key: TMDB_API_KEY },
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch movie details');
  }
};

const searchMovies = async (query) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query.trim(),
        page: 1,
      },
    });
    return response.data.results.map((movie) => ({
      id: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      overview: movie.overview,
      runtime: movie.runtime || 120, // Default runtime
    }));
  } catch (error) {
    console.error('TMDB search error:', error.message);
    throw new Error('Failed to search movies');
  }
};

const createWatchParty = async (userId, { title, description, dateTime, movieIds, isPublic, invitedUserIds }) => {
  const watchPartyRef = db.collection('watchParties').doc();
  const movies = await Promise.all(movieIds.map(async (movieId) => {
    const movie = await getMovieDetails(movieId);
    return {
      id: movie.id,
      title: movie.title,
      runtime: movie.runtime,
      poster_path: movie.poster_path,
    };
  }));

  const watchPartyData = {
    title,
    description,
    hostId: userId,
    dateTime: admin.firestore.Timestamp.fromDate(new Date(dateTime)),
    movies,
    isPublic: isPublic || false,
    participants: [userId],
    invitedUserIds: invitedUserIds || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'scheduled',
  };

  await watchPartyRef.set(watchPartyData);

  if (invitedUserIds && invitedUserIds.length > 0) {
    await Promise.all(invitedUserIds.map(async (invitedUserId) => {
      await sendNotification(invitedUserId, {
        type: 'watchPartyInvite',
        message: `You've been invited to "${title}" by ${userId}`,
        watchPartyId: watchPartyRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }));
  }

  return { id: watchPartyRef.id, ...watchPartyData };
};

const joinWatchParty = async (userId, watchPartyId) => {
  const watchPartyRef = db.collection('watchParties').doc(watchPartyId);
  const watchPartyDoc = await watchPartyRef.get();
  if (!watchPartyDoc.exists) throw new Error('Watch party not found');

  const watchParty = watchPartyDoc.data();
  if (!watchParty.isPublic && !watchParty.invitedUserIds.includes(userId)) {
    throw new Error('You are not invited to this watch party');
  }
  if (watchParty.participants.includes(userId)) {
    throw new Error('You are already a participant');
  }

  await watchPartyRef.update({
    participants: admin.firestore.FieldValue.arrayUnion(userId),
    invitedUserIds: admin.firestore.FieldValue.arrayRemove(userId),
  });

  await sendNotification(watchParty.hostId, {
    type: 'watchPartyJoin',
    message: `${userId} joined your watch party "${watchParty.title}"`,
    watchPartyId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: watchPartyId, ...watchParty, participants: [...watchParty.participants, userId] };
};

const getWatchParty = async (watchPartyId) => {
  const watchPartyRef = db.collection('watchParties').doc(watchPartyId);
  const watchPartyDoc = await watchPartyRef.get();
  if (!watchPartyDoc.exists) throw new Error('Watch party not found');
  return { id: watchPartyDoc.id, ...watchPartyDoc.data() };
};

async function getUserWatchParties(userId) {
  try {
    const watchPartiesQuery = db
      .collection('watchParties')
      .where('participants', 'array-contains', userId);
    const querySnapshot = await watchPartiesQuery.get();
    const watchParties = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateTime: data.dateTime.toDate().toISOString(),
        createdAt: data.createdAt?.toDate().toISOString(),
      };
    });
    return watchParties;
  } catch (err) {
    console.error('Error fetching user watch parties:', err);
    throw new Error('Failed to fetch watch parties');
  }
}

const getPublicWatchParties = async () => {
  const watchPartiesSnapshot = await db.collection('watchParties')
    .where('isPublic', '==', true)
    .where('status', '==', 'scheduled')
    .get();
  return watchPartiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const sendMessage = async (watchPartyId, userId, messages) => {
  const messagesRef = db.collection('watchpartyMessages').doc();
  const messageData = {
    watchPartyId,
    userId,
    messages: messages.map(m => ({
      encryptedMessage: m.encryptedMessage,
      encryptedSymmetricKey: m.encryptedSymmetricKey,
      nonce: m.nonce,
      recipientPublicKey: m.recipientPublicKey,
      timestamp: new Date()
    }))
  };
  await messagesRef.set(messageData);
  return { id: messagesRef.id, ...messageData };
};

const getMessages = async (watchPartyId) => {
  const snapshot = await db.collection('watchpartyMessages')
    .where('watchPartyId', '==', watchPartyId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const sendNotification = async (userId, notification) => {
  const notificationRef = db.collection('notifications').doc(userId).collection('userNotifications').doc();
  await notificationRef.set(notification);
  return { id: notificationRef.id, ...notification };
};

const getNotifications = async (userId) => {
  const notificationsSnapshot = await db.collection('notifications').doc(userId)
    .collection('userNotifications')
    .orderBy('createdAt', 'desc')
    .get();
  return notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const addUserPublicKey = async (watchPartyId, userId, publicKey) => {
  const userRef = db.collection('watchpartyUsers').doc(`${watchPartyId}_${userId}`);
  console.log(`Adding public key for user ${userId} in watchParty ${watchPartyId}`); // Debug log
  await userRef.set({ watchPartyId, userId, publicKey }, { merge: true });
};

const getUsers = async (watchPartyId) => {
  console.log(`Querying users for watchPartyId: ${watchPartyId}`); // Debug log
  const snapshot = await db.collection('watchpartyUsers')
    .where('watchPartyId', '==', watchPartyId)
    .get();
  console.log(`Query returned ${snapshot.size} documents`); // Debug log
  return snapshot.docs.map(doc => ({ userId: doc.data().userId, publicKey: doc.data().publicKey }));
};

module.exports = {
  createWatchParty,
  joinWatchParty,
  getWatchParty,
  getUserWatchParties,
  getPublicWatchParties,
  sendMessage,
  getMessages,
  sendNotification,
  getNotifications,
  getUsers,
  addUserPublicKey,
  searchMovies,
};
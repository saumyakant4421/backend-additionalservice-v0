const express = require('express');
const {
  createWatchPartyHandler,
  joinWatchPartyHandler,
  getWatchPartyHandler,
  getUserWatchPartiesHandler,
  getPublicWatchPartiesHandler,
  sendMessageHandler,
  getMessagesHandler,
  getNotificationsHandler,
  addUserPublicKeyHandler,
  getUsersHandler
} = require('../controllers/watchPartyController');
const { authMiddleware } = require('../middleware/authMiddleware');
const watchPartyService = require('../services/watchPartyService');

const router = express.Router();

// Specific routes first
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length < 1) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    const movies = await watchPartyService.searchMovies(query);
    res.status(200).json(movies);
  } catch (error) {
    console.error('Error searching movies:', error.message);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

router.get('/user', authMiddleware, getUserWatchPartiesHandler);
router.get('/public', getPublicWatchPartiesHandler);
router.get('/notifications', authMiddleware, getNotificationsHandler);

// Parameterized routes last
router.post('/create', authMiddleware, createWatchPartyHandler);
router.post('/join/:watchPartyId', authMiddleware, joinWatchPartyHandler);
router.get('/:watchPartyId', authMiddleware, getWatchPartyHandler);
router.post('/:watchPartyId/message', authMiddleware, sendMessageHandler);
router.get('/:watchPartyId/messages', authMiddleware, getMessagesHandler);
router.get('/:watchPartyId/users', authMiddleware, getUsersHandler);
router.post('/:watchPartyId/users', authMiddleware, addUserPublicKeyHandler);

module.exports = router;
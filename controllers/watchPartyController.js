const {
  createWatchParty,
  joinWatchParty,
  getWatchParty,
  getUserWatchParties,
  getPublicWatchParties,
  sendMessage,
  getMessages,
  getNotifications,
  addUserPublicKey,
  getUsers
} = require('../services/watchPartyService');
const logger = require('../services/logger');

const createWatchPartyHandler = async (req, res) => {
  const userId = req.user.uid;
  const { title, description, dateTime, movieIds, isPublic, invitedUserIds } = req.body;
  if (!title || !dateTime || !movieIds || !Array.isArray(movieIds)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const watchParty = await createWatchParty(userId, { title, description, dateTime, movieIds, isPublic, invitedUserIds });
    res.json(watchParty);
  } catch (error) {
  logger.error(`Controller Error in createWatchPartyHandler for user ${userId}: ${error.message}`);
  res.status(400).json({ error: 'Failed to create watch party' });
  }
};

const joinWatchPartyHandler = async (req, res) => {
  const userId = req.user.uid;
  const { watchPartyId } = req.params;
  if (!watchPartyId) {
    return res.status(400).json({ error: 'Watch party ID is required' });
  }
  try {
    const watchParty = await joinWatchParty(userId, watchPartyId);
    res.json(watchParty);
  } catch (error) {
  logger.error(`Controller Error in joinWatchPartyHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(400).json({ error: 'Failed to join watch party' });
  }
};

const getWatchPartyHandler = async (req, res) => {
  const { watchPartyId } = req.params;
  logger.debug(`getWatchPartyHandler called for watchPartyId: ${watchPartyId}`);
  try {
    const watchParty = await getWatchParty(watchPartyId);
    res.json(watchParty);
  } catch (error) {
  logger.error(`Controller Error in getWatchPartyHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(404).json({ error: 'Watch party not found' });
  }
};

const getUserWatchPartiesHandler = async (req, res) => {
  const userId = req.user.uid;
  logger.debug(`getUserWatchPartiesHandler called for user ${userId}`);
  try {
    const watchParties = await getUserWatchParties(userId);
    res.json(watchParties);
  } catch (error) {
  logger.error(`Controller Error in getUserWatchPartiesHandler for user ${userId}: ${error.message}`);
  res.status(500).json({ error: 'Failed to fetch watch parties' });
  }
};

const getPublicWatchPartiesHandler = async (req, res) => {
  logger.debug('getPublicWatchPartiesHandler called');
  try {
    const watchParties = await getPublicWatchParties();
    res.json(watchParties);
  } catch (error) {
  logger.error(`Controller Error in getPublicWatchPartiesHandler: ${error.message}`);
  res.status(500).json({ error: 'Failed to fetch public watch parties' });
  }
};

const sendMessageHandler = async (req, res) => {
  const userId = req.user.uid;
  const { watchPartyId } = req.params;
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }
  try {
    const messageData = await sendMessage(watchPartyId, userId, messages);
    res.json(messageData);
  } catch (error) {
  logger.error(`Controller Error in sendMessageHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(400).json({ error: 'Failed to send message' });
  }
};

const getMessagesHandler = async (req, res) => {
  const { watchPartyId } = req.params;
  try {
    const messages = await getMessages(watchPartyId);
    res.json(messages);
  } catch (error) {
  logger.error(`Controller Error in getMessagesHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const getNotificationsHandler = async (req, res) => {
  const userId = req.user.uid;
  logger.debug(`getNotificationsHandler called for user ${userId}`);
  try {
    const notifications = await getNotifications(userId);
    res.json(notifications);
  } catch (error) {
  logger.error(`Controller Error in getNotificationsHandler for user ${userId}: ${error.message}`);
  res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const addUserPublicKeyHandler = async (req, res) => {
  const userId = req.user.uid;
  const { watchPartyId } = req.params;
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: 'Public key is required' });
  }
  try {
    await addUserPublicKey(watchPartyId, userId, publicKey);
    res.status(200).json({ message: 'Public key added successfully' });
  } catch (error) {
  logger.error(`Controller Error in addUserPublicKeyHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(400).json({ error: 'Failed to add public key' });
  }
};

const getUsersHandler = async (req, res) => {
  const { watchPartyId } = req.params;
  logger.debug(`getUsersHandler called for watchPartyId: ${watchPartyId}`);
  try {
    const users = await getUsers(watchPartyId);
  logger.debug(`Fetched users: ${JSON.stringify(users)}`);
    res.json(users); // Return empty array if no users, no 404
  } catch (error) {
  logger.error(`Controller Error in getUsersHandler for ID ${watchPartyId}: ${error.message}`);
  res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = {
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
};
const express = require('express');
const {
  searchMoviesHandler,
  addMovieToBucketHandler,
  removeMovieFromBucketHandler,
  getBucketHandler,
  calculateTotalRuntimeHandler,
} = require('../controllers/marathonController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/search', searchMoviesHandler);
router.get('/bucket', authMiddleware, getBucketHandler);
router.post('/bucket/add', authMiddleware, addMovieToBucketHandler);
router.delete('/bucket/remove/:movieId', authMiddleware, removeMovieFromBucketHandler);
router.get('/bucket/runtime', authMiddleware, calculateTotalRuntimeHandler);

module.exports = router;
const {
  searchMovies,
  addMovieToBucket,
  removeMovieFromBucket,
  getBucket,
  calculateTotalRuntime,
} = require('../services/marathonService');

const searchMoviesHandler = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query is required' });
  try {
    const movies = await searchMovies(query);
    res.json(movies);
  } catch (error) {
    console.error('Controller Error in searchMoviesHandler:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const addMovieToBucketHandler = async (req, res) => {
  const { movieId } = req.body;
  const userId = req.user.uid;
  if (!movieId || isNaN(movieId)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }
  try {
    const bucket = await addMovieToBucket(userId, movieId);
    res.json(bucket);
  } catch (error) {
    console.error('Controller Error in addMovieToBucketHandler:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const removeMovieFromBucketHandler = async (req, res) => {
  const { movieId } = req.params;
  const userId = req.user.uid;
  if (!movieId || isNaN(movieId)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }
  try {
    const bucket = await removeMovieFromBucket(userId, movieId);
    res.json(bucket);
  } catch (error) {
    console.error('Controller Error in removeMovieFromBucketHandler:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const getBucketHandler = async (req, res) => {
  const userId = req.user.uid;
  try {
    const bucket = await getBucket(userId);
    res.json(bucket);
  } catch (error) {
    console.error('Controller Error in getBucketHandler:', error.message);
    res.status(500).json({ error: 'Failed to fetch bucket' });
  }
};

const calculateTotalRuntimeHandler = async (req, res) => {
  const userId = req.user.uid;
  try {
    const runtime = await calculateTotalRuntime(userId);
    res.json(runtime);
  } catch (error) {
    console.error('Controller Error in calculateTotalRuntimeHandler:', error.message);
    res.status(500).json({ error: 'Failed to calculate runtime' });
  }
};

module.exports = {
  searchMoviesHandler,
  addMovieToBucketHandler,
  removeMovieFromBucketHandler,
  getBucketHandler,
  calculateTotalRuntimeHandler,
};
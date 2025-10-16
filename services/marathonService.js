const axios = require('axios');
const admin = require('firebase-admin');
const firebaseConfig = require('../config/firebase');
const dotenv = require('dotenv');
const NodeCache = require('node-cache');

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Initialize cache with 24 hour TTL
const cache = new NodeCache({ stdTTL: 24 * 60 * 60 });

const searchMovies = async (query) => {
  const cacheKey = `search_${query.toLowerCase().replace(/\s+/g, '_')}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    console.log(`Serving movie search for "${query}" from cache`);
    return cache.get(cacheKey);
  }

  try {
    console.log('Making TMDB API call for query:', query);
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: { api_key: TMDB_API_KEY, query, page: 1, include_adult: false },
    });
    console.log('TMDB API response:', response.data.results.length);
    
    const results = response.data.results || [];
    // Cache the results
    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('TMDB API error:', error.message, error.response?.data);
    throw new Error('Failed to search movies');
  }
};

const getMovieDetails = async (movieId) => {
  const cacheKey = `movie_${movieId}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    console.log(`Serving movie details for ID ${movieId} from cache`);
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
      params: { api_key: TMDB_API_KEY },
    });
    
    // Cache the movie details
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch movie details');
  }
};

const addMovieToBucket = async (userId, movieId) => {
  const movie = await getMovieDetails(movieId);
  if (!movie.runtime) throw new Error('Movie runtime not available');

  const db = firebaseConfig.getDb();
  const bucketRef = db.collection('buckets').doc(userId);
  const bucketDoc = await bucketRef.get();
  let movies = bucketDoc.exists ? bucketDoc.data().movies : [];

  if (movies.length >= 30) {
    throw new Error('Bucket limit reached (30 movies)');
  }

  if (movies.some((m) => m.id === movieId)) {
    throw new Error('Movie already in bucket');
  }

  const movieData = {
    id: movie.id,
    title: movie.title,
    runtime: movie.runtime,
    poster_path: movie.poster_path,
    addedAt: admin.firestore.Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp()
  };

  movies.push(movieData);
  await bucketRef.set({ movies, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Clear cache when bucket is modified
  cache.del(`bucket_${userId}`);
  cache.del(`bucket_runtime_${userId}`);

  return { userId, movies };
};

const removeMovieFromBucket = async (userId, movieId) => {
  const db = firebaseConfig.getDb();
  const bucketRef = db.collection('buckets').doc(userId);
  const bucketDoc = await bucketRef.get();
  if (!bucketDoc.exists) throw new Error('Bucket not found');

  const movies = bucketDoc.data().movies.filter((m) => m.id !== Number(movieId));
  await bucketRef.set({ movies, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Clear cache when bucket is modified
  cache.del(`bucket_${userId}`);
  cache.del(`bucket_runtime_${userId}`);

  return { userId, movies };
};

const getBucket = async (userId) => {
  const cacheKey = `bucket_${userId}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    console.log(`Serving bucket for user ${userId} from cache`);
    return cache.get(cacheKey);
  }

  try {
    const db = firebaseConfig.getDb();
    const bucketRef = db.collection('buckets').doc(userId);
    const bucketDoc = await bucketRef.get();
    const result = bucketDoc.exists ? { userId, movies: bucketDoc.data().movies } : { userId, movies: [] };

    // Cache bucket data for 10 minutes
    cache.set(cacheKey, result, 600);
    return result;
  } catch (err) {
    console.error('Error fetching bucket from Firestore for user', userId, err);
    throw new Error('Firestore error when fetching bucket');
  }
};

const calculateTotalRuntime = async (userId) => {
  const cacheKey = `bucket_runtime_${userId}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    console.log(`Serving runtime calculation for user ${userId} from cache`);
    return cache.get(cacheKey);
  }

  const bucket = await getBucket(userId);
  const totalMinutes = bucket.movies.reduce((sum, movie) => sum + movie.runtime, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const result = {
    totalMinutes,
    formatted: `${hours}h ${minutes}m`,
    movieCount: bucket.movies.length,
  };
  
  // Cache runtime calculation for 10 minutes
  cache.set(cacheKey, result, 600);
  return result;
};

module.exports = {
  searchMovies,
  addMovieToBucket,
  removeMovieFromBucket,
  getBucket,
  calculateTotalRuntime,
};
const axios = require('axios');
const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const dotenv = require('dotenv');

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const searchMovies = async (query) => {
  try {
    console.log('Making TMDB API call for query:', query);
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: { api_key: TMDB_API_KEY, query, page: 1, include_adult: false },
    });
    console.log('TMDB API response:', response.data.results.length);
    return response.data.results || [];
  } catch (error) {
    console.error('TMDB API error:', error.message, error.response?.data);
    throw new Error('Failed to search movies');
  }
};

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

const addMovieToBucket = async (userId, movieId) => {
  const movie = await getMovieDetails(movieId);
  if (!movie.runtime) throw new Error('Movie runtime not available');

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

  return { userId, movies };
};

const removeMovieFromBucket = async (userId, movieId) => {
  const bucketRef = db.collection('buckets').doc(userId);
  const bucketDoc = await bucketRef.get();
  if (!bucketDoc.exists) throw new Error('Bucket not found');

  const movies = bucketDoc.data().movies.filter((m) => m.id !== Number(movieId));
  await bucketRef.set({ movies, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  return { userId, movies };
};

const getBucket = async (userId) => {
  const bucketRef = db.collection('buckets').doc(userId);
  const bucketDoc = await bucketRef.get();
  return bucketDoc.exists ? { userId, movies: bucketDoc.data().movies } : { userId, movies: [] };
};

const calculateTotalRuntime = async (userId) => {
  const bucket = await getBucket(userId);
  const totalMinutes = bucket.movies.reduce((sum, movie) => sum + movie.runtime, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    formatted: `${hours}h ${minutes}m`,
    movieCount: bucket.movies.length,
  };
};

module.exports = {
  searchMovies,
  addMovieToBucket,
  removeMovieFromBucket,
  getBucket,
  calculateTotalRuntime,
};
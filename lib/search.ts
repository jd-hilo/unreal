import Constants from 'expo-constants';

// API Keys (should be in environment variables)
const TMDB_API_KEY = Constants.expoConfig?.extra?.tmdbApiKey || process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
const SPOTIFY_CLIENT_ID = Constants.expoConfig?.extra?.spotifyClientId || process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = Constants.expoConfig?.extra?.spotifyClientSecret || process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || '';

const DEV_MODE = !TMDB_API_KEY && !SPOTIFY_CLIENT_ID;

export interface SearchResult {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface MovieSearchResult extends SearchResult {
  releaseDate?: string;
  rating?: number;
}

export interface MusicArtistResult extends SearchResult {
  genres?: string[];
  popularity?: number;
}

/**
 * Search for movies using TMDB API
 * If query is empty, returns popular movies
 */
export async function searchMovies(query: string, limit: number = 20): Promise<MovieSearchResult[]> {
  if (DEV_MODE || !TMDB_API_KEY) {
    // Return mock data in dev mode
    return mockMovieResults(query, limit);
  }

  try {
    // If query is empty, get popular movies instead
    const url = query.trim() === ''
      ? `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=1`
      : `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).slice(0, limit).map((movie: any) => ({
      id: movie.id.toString(),
      name: movie.title,
      imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
      description: movie.overview,
      releaseDate: movie.release_date,
      rating: movie.vote_average,
      metadata: {
        tmdb_id: movie.id,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
      },
    }));
  } catch (error) {
    console.error('Error searching movies:', error);
    return mockMovieResults(query, limit);
  }
}

/**
 * Search for music artists using Spotify API
 * If query is empty, returns popular artists
 */
export async function searchMusicArtists(query: string, limit: number = 20): Promise<MusicArtistResult[]> {
  if (DEV_MODE || !SPOTIFY_CLIENT_ID) {
    // Return mock data in dev mode
    return mockMusicArtistResults(query, limit);
  }

  // If query is empty, return popular artists from mock data
  if (query.trim() === '') {
    return mockMusicArtistResults('', limit);
  }

  try {
    // First, get an access token
    // Note: For production, this should be done server-side to keep credentials secure
    // For now, we'll use a simpler approach or mock data
    const credentials = `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`;
    // Use a simple base64 encoding (works in React Native)
    let base64Credentials: string;
    if (typeof btoa !== 'undefined') {
      base64Credentials = btoa(credentials);
    } else if (typeof Buffer !== 'undefined') {
      base64Credentials = Buffer.from(credentials).toString('base64');
    } else {
      // Fallback: simple base64 encoding for React Native
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let result = '';
      let i = 0;
      while (i < credentials.length) {
        const a = credentials.charCodeAt(i++);
        const b = i < credentials.length ? credentials.charCodeAt(i++) : 0;
        const c = i < credentials.length ? credentials.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63) +
          (i - 2 < credentials.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
          (i - 1 < credentials.length ? chars.charAt(bitmap & 63) : '=');
      }
      base64Credentials = result;
    }
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Spotify token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Then search for artists
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`;
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.artists?.items || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url,
      genres: artist.genres || [],
      popularity: artist.popularity,
      metadata: {
        spotify_id: artist.id,
        followers: artist.followers?.total,
        genres: artist.genres,
        popularity: artist.popularity,
      },
    }));
  } catch (error) {
    console.error('Error searching music artists:', error);
    return mockMusicArtistResults(query, limit);
  }
}

/**
 * Search for food types (predefined list with search filtering)
 * If query is empty, returns all food types
 */
export function searchFoodTypes(query: string, limit: number = 30): SearchResult[] {
  const foodTypes = [
    'Italian', 'Mexican', 'Japanese', 'Thai', 'Indian', 'Chinese',
    'French', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek',
    'Spanish', 'Lebanese', 'Ethiopian', 'Brazilian', 'Moroccan', 'Turkish',
    'Caribbean', 'Fusion', 'BBQ', 'Seafood', 'Vegetarian', 'Vegan',
    'Pizza', 'Burgers', 'Sushi', 'Tacos', 'Pasta', 'Steak',
    'Desserts', 'Breakfast', 'Brunch', 'Fast Food', 'Fine Dining', 'Street Food',
  ];

  // If query is empty, return all food types
  if (query.trim() === '') {
    return foodTypes.slice(0, limit).map(food => ({
      id: food.toLowerCase().replace(/\s+/g, '_'),
      name: food,
    }));
  }

  const lowerQuery = query.toLowerCase();
  const filtered = foodTypes
    .filter(food => food.toLowerCase().includes(lowerQuery))
    .slice(0, limit);

  return filtered.map(food => ({
    id: food.toLowerCase().replace(/\s+/g, '_'),
    name: food,
  }));
}

/**
 * Search for fashion styles (predefined list with search filtering)
 * If query is empty, returns all fashion styles
 */
export function searchFashionStyles(query: string, limit: number = 30): SearchResult[] {
  const fashionStyles = [
    'Casual', 'Formal', 'Streetwear', 'Vintage', 'Minimalist', 'Bohemian',
    'Athletic', 'Designer', 'Sustainable', 'Classic', 'Trendy', 'Elegant',
    'Comfortable', 'Bold', 'Neutral', 'Colorful', 'Monochrome', 'Layered',
    'Accessorized', 'Simple', 'Grunge', 'Preppy', 'Goth', 'Punk',
    'Romantic', 'Edgy', 'Feminine', 'Masculine', 'Androgynous', 'Eclectic',
  ];

  // If query is empty, return all fashion styles
  if (query.trim() === '') {
    return fashionStyles.slice(0, limit).map(style => ({
      id: style.toLowerCase().replace(/\s+/g, '_'),
      name: style,
    }));
  }

  const lowerQuery = query.toLowerCase();
  const filtered = fashionStyles
    .filter(style => style.toLowerCase().includes(lowerQuery))
    .slice(0, limit);

  return filtered.map(style => ({
    id: style.toLowerCase().replace(/\s+/g, '_'),
    name: style,
  }));
}

// Mock data for development
function mockMovieResults(query: string, limit: number): MovieSearchResult[] {
  const mockMovies = [
    { name: 'The Matrix', year: '1999', rating: 8.7 },
    { name: 'Inception', year: '2010', rating: 8.8 },
    { name: 'Interstellar', year: '2014', rating: 8.6 },
    { name: 'The Dark Knight', year: '2008', rating: 9.0 },
    { name: 'Pulp Fiction', year: '1994', rating: 8.9 },
  ];

  return mockMovies.slice(0, limit).map((movie, index) => ({
    id: `mock-movie-${index}`,
    name: movie.name,
    description: `A classic ${movie.name} film from ${movie.year}`,
    releaseDate: `${movie.year}-01-01`,
    rating: movie.rating,
    metadata: { mock: true },
  }));
}

function mockMusicArtistResults(query: string, limit: number): MusicArtistResult[] {
  const mockArtists = [
    'The Beatles', 'Taylor Swift', 'Drake', 'Beyoncé', 'Ed Sheeran',
    'Ariana Grande', 'The Weeknd', 'Billie Eilish', 'Post Malone', 'Dua Lipa',
  ];

  return mockArtists.slice(0, limit).map((artist, index) => ({
    id: `mock-artist-${index}`,
    name: artist,
    genres: ['Pop', 'Rock'],
    popularity: 80,
    metadata: { mock: true },
  }));
}


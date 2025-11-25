import Constants from 'expo-constants';

const ACCESS_KEY = 
  Constants.expoConfig?.extra?.unsplashAccessKey ||
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  '';

const APPLICATION_ID = 
  Constants.expoConfig?.extra?.unsplashApplicationId ||
  process.env.EXPO_PUBLIC_UNSPLASH_APPLICATION_ID ||
  '';

const DEV_MODE = !ACCESS_KEY;

if (DEV_MODE) {
  console.warn('⚠️ Unsplash API key not found. Set EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in .env file');
}

export interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
  };
}

export interface UnsplashSearchResponse {
  results: UnsplashImage[];
  total: number;
  total_pages: number;
}

/**
 * Search for images on Unsplash
 * @param query Search query string
 * @param perPage Number of results per page (max 30)
 * @param page Page number
 * @returns Promise with search results
 */
export async function searchUnsplash(
  query: string,
  perPage: number = 10,
  page: number = 1
): Promise<UnsplashSearchResponse> {
  if (DEV_MODE) {
    // Return mock data in dev mode
    return mockUnsplashResponse(query);
  }

  if (!ACCESS_KEY) {
    throw new Error('Unsplash API key not configured');
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unsplash API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching Unsplash:', error);
    // Return mock data on error to prevent app crash
    return mockUnsplashResponse(query);
  }
}

/**
 * Get a random image for a query
 * @param query Search query string
 * @returns Promise with a single image
 */
export async function getRandomImage(query: string): Promise<UnsplashImage | null> {
  const results = await searchUnsplash(query, 1, Math.floor(Math.random() * 50) + 1);
  
  if (results.results && results.results.length > 0) {
    return results.results[0];
  }
  
  return null;
}

/**
 * Get image description (alt text or description)
 * @param image Unsplash image object
 * @returns Description string
 */
export function getImageDescription(image: UnsplashImage): string {
  return image.description || image.alt_description || `Photo by ${image.user.name}`;
}

/**
 * Mock response for development/testing
 */
function mockUnsplashResponse(query: string): UnsplashSearchResponse {
  const mockImage: UnsplashImage = {
    id: `mock-${query}-${Date.now()}`,
    urls: {
      regular: `https://via.placeholder.com/800x600?text=${encodeURIComponent(query)}`,
      small: `https://via.placeholder.com/400x300?text=${encodeURIComponent(query)}`,
      thumb: `https://via.placeholder.com/200x150?text=${encodeURIComponent(query)}`,
    },
    description: `Mock image for ${query}`,
    alt_description: `Mock image for ${query}`,
    user: {
      name: 'Mock User',
    },
  };

  return {
    results: [mockImage],
    total: 1,
    total_pages: 1,
  };
}







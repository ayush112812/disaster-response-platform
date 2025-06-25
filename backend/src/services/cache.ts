import { supabase } from './supabase';

export interface CacheEntry {
  key: string;
  value: any;
  expires_at: string;
}

export interface GeocodeCache {
  location_name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Cache geocoding results to avoid repeated API calls
 */
export async function cacheGeocodeResult(
  locationName: string, 
  coordinates: { lat: number; lng: number }
): Promise<void> {
  try {
    const cacheKey = `geocode:${locationName.toLowerCase()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    const cacheEntry: CacheEntry = {
      key: cacheKey,
      value: {
        location_name: locationName,
        coordinates
      },
      expires_at: expiresAt.toISOString()
    };
    
    console.log('💾 Caching geocode result:', cacheKey);
    
    // Upsert into cache table
    const { error } = await supabase
      .from('cache')
      .upsert(cacheEntry, { onConflict: 'key' });
    
    if (error) {
      console.warn('Failed to cache geocode result:', error);
    } else {
      console.log('✅ Cached geocode result for 1 hour');
    }
  } catch (error) {
    console.warn('Error caching geocode result:', error);
  }
}

/**
 * Get cached geocoding result
 */
export async function getCachedGeocodeResult(locationName: string): Promise<GeocodeCache | null> {
  try {
    const cacheKey = `geocode:${locationName.toLowerCase()}`;
    
    console.log('🔍 Checking cache for:', cacheKey);
    
    const { data, error } = await supabase
      .from('cache')
      .select('*')
      .eq('key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      console.log('❌ No valid cache entry found');
      return null;
    }
    
    console.log('✅ Found cached geocode result');
    return data.value as GeocodeCache;
  } catch (error) {
    console.warn('Error getting cached geocode result:', error);
    return null;
  }
}

/**
 * Cache disaster analysis results
 */
export async function cacheDisasterAnalysis(
  text: string,
  analysis: {
    isDisasterRelated: boolean;
    type: string;
    severity: string;
    extractedLocation?: string;
    coordinates?: { lat: number; lng: number };
  }
): Promise<void> {
  try {
    const cacheKey = `analysis:${Buffer.from(text).toString('base64').substring(0, 50)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    
    const cacheEntry: CacheEntry = {
      key: cacheKey,
      value: {
        text,
        analysis,
        timestamp: new Date().toISOString()
      },
      expires_at: expiresAt.toISOString()
    };
    
    console.log('💾 Caching disaster analysis:', cacheKey);
    
    const { error } = await supabase
      .from('cache')
      .upsert(cacheEntry, { onConflict: 'key' });
    
    if (error) {
      console.warn('Failed to cache disaster analysis:', error);
    } else {
      console.log('✅ Cached disaster analysis for 30 minutes');
    }
  } catch (error) {
    console.warn('Error caching disaster analysis:', error);
  }
}

/**
 * Get cached disaster analysis
 */
export async function getCachedDisasterAnalysis(text: string): Promise<any | null> {
  try {
    const cacheKey = `analysis:${Buffer.from(text).toString('base64').substring(0, 50)}`;
    
    console.log('🔍 Checking cache for disaster analysis:', cacheKey);
    
    const { data, error } = await supabase
      .from('cache')
      .select('*')
      .eq('key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      console.log('❌ No valid cached analysis found');
      return null;
    }
    
    console.log('✅ Found cached disaster analysis');
    return data.value;
  } catch (error) {
    console.warn('Error getting cached disaster analysis:', error);
    return null;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    console.log('🧹 Cleaning up expired cache entries...');
    
    const { data, error } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('key');
    
    if (error) {
      console.warn('Error cleaning up cache:', error);
    } else {
      console.log(`✅ Cleaned up ${data?.length || 0} expired cache entries`);
    }
  } catch (error) {
    console.warn('Error during cache cleanup:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number;
  expired: number;
  geocode: number;
  analysis: number;
}> {
  try {
    const now = new Date().toISOString();
    
    // Get total count
    const { count: total } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true });
    
    // Get expired count
    const { count: expired } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);
    
    // Get geocode count
    const { count: geocode } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true })
      .like('key', 'geocode:%')
      .gte('expires_at', now);
    
    // Get analysis count
    const { count: analysis } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true })
      .like('key', 'analysis:%')
      .gte('expires_at', now);
    
    return {
      total: total || 0,
      expired: expired || 0,
      geocode: geocode || 0,
      analysis: analysis || 0
    };
  } catch (error) {
    console.warn('Error getting cache stats:', error);
    return { total: 0, expired: 0, geocode: 0, analysis: 0 };
  }
}

/**
 * Generic cache functions for all external API responses (as specified in assignment)
 */

/**
 * Get cached data by key
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export async function getFromCache(key: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('cache')
      .select('value, expires_at')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.log(`🔍 Cache miss for key: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit for key: ${key}`);
    return data.value;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Store data in cache with TTL (1 hour default as specified in assignment)
 * @param key Cache key
 * @param value Data to cache (will be stored as JSONB)
 * @param ttlSeconds TTL in seconds (default: 1 hour)
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { error } = await supabase
      .from('cache')
      .upsert({
        key,
        value,
        expires_at: expiresAt
      });

    if (error) {
      console.error('Error storing in cache:', error);
      throw error;
    }

    console.log(`💾 Cached data for key: ${key} (expires: ${expiresAt})`);
  } catch (error) {
    console.error('Error setting cache:', error);
    throw error;
  }
}

/**
 * Cache wrapper for external API calls (as specified in assignment)
 * @param key Cache key
 * @param fetchFunction Function that fetches data from external API
 * @param ttlSeconds TTL in seconds (default: 1 hour)
 * @returns Cached or fresh data
 */
export async function cacheWrapper<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  console.log(`🔄 Fetching fresh data for key: ${key}`);
  const freshData = await fetchFunction();

  // Store in cache
  await setCache(key, freshData, ttlSeconds);

  return freshData;
}

/**
 * Generate cache keys for different types of external API data (as specified in assignment)
 */
export const CacheKeys = {
  officialUpdates: (disasterId: string) => `official_updates:${disasterId}`,
  socialMedia: (disasterId: string) => `social_media:${disasterId}`,
  geocoding: (location: string) => `geocoding:${encodeURIComponent(location)}`,
  geminiLocation: (description: string) => `gemini_location:${encodeURIComponent(description.substring(0, 100))}`,
  geminiImage: (imageUrl: string) => `gemini_image:${encodeURIComponent(imageUrl)}`,
  browsePageData: (url: string) => `browse_page:${encodeURIComponent(url)}`,
  mappingService: (location: string) => `mapping:${encodeURIComponent(location)}`
};

/**
 * Initialize cache cleanup interval
 */
export function initializeCacheCleanup(): void {
  // Clean up expired cache entries every 30 minutes
  setInterval(cleanupExpiredCache, 30 * 60 * 1000);
  console.log('🧹 Cache cleanup initialized (every 30 minutes)');
}

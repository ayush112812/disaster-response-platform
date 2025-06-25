const MapboxClient = require('@mapbox/mapbox-sdk');
const GeoCodingService = require('@mapbox/mapbox-sdk/services/geocoding');
import config from '../config';

const mapboxClient = new MapboxClient({ accessToken: config.mapbox.accessToken });
const geocodingClient = new GeoCodingService(mapboxClient);

export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  console.log('🗺️ Geocoding location with multiple services:', locationName);

  // Try Mapbox first (if API key is available)
  if (config.mapbox?.accessToken) {
    try {
      console.log('🗺️ Trying Mapbox geocoding...');
      const response = await geocodingClient
        .forwardGeocode({
          query: locationName,
          limit: 1,
          types: ['place', 'locality', 'neighborhood', 'address']
        })
        .send();

      const match = response.body.features[0];
      if (match) {
        const [lng, lat] = match.center;
        console.log('✅ Mapbox geocoding successful:', { lat, lng });
        return { lat, lng };
      }
    } catch (error) {
      console.warn('⚠️ Mapbox geocoding failed:', error);
    }
  }

  // Fallback to OpenStreetMap Nominatim (free, no API key required)
  try {
    console.log('🌍 Trying OpenStreetMap geocoding...');
    const encodedLocation = encodeURIComponent(locationName);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        console.log('✅ OpenStreetMap geocoding successful:', coordinates);
        return coordinates;
      }
    }
  } catch (error) {
    console.warn('⚠️ OpenStreetMap geocoding failed:', error);
  }

  // Final fallback to known locations
  console.log('🔄 Using fallback coordinates...');
  return geocodeWithFallback(locationName);
}

/**
 * Fallback geocoding using known city coordinates
 */
function geocodeWithFallback(locationName: string): { lat: number; lng: number } | null {
  const knownLocations: Record<string, { lat: number; lng: number }> = {
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'san diego': { lat: 32.7157, lng: -117.1611 },
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'tampa': { lat: 27.9506, lng: -82.4572 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'atlanta': { lat: 33.7490, lng: -84.3880 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'las vegas': { lat: 36.1699, lng: -115.1398 },
    'portland': { lat: 45.5152, lng: -122.6784 },
    'nashville': { lat: 36.1627, lng: -86.7816 },
    'napa valley': { lat: 38.5025, lng: -122.2654 },
    'palo alto': { lat: 37.4419, lng: -122.1430 }
  };

  const normalizedLocation = locationName.toLowerCase();

  // Try exact match first
  if (knownLocations[normalizedLocation]) {
    console.log('✅ Using fallback coordinates for:', normalizedLocation);
    return knownLocations[normalizedLocation];
  }

  // Try partial match
  const foundKey = Object.keys(knownLocations).find(key =>
    normalizedLocation.includes(key) || key.includes(normalizedLocation.split(',')[0]?.trim() || '')
  );

  if (foundKey) {
    console.log('✅ Using partial match fallback coordinates for:', foundKey);
    return knownLocations[foundKey];
  }

  console.log('❌ No coordinates found for location:', locationName);
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await geocodingClient
      .reverseGeocode({
        query: [lng, lat],
        limit: 1
      })
      .send();

    return response.body.features[0]?.place_name || null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}


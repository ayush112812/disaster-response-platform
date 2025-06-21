const MapboxClient = require('@mapbox/mapbox-sdk');
const GeoCodingService = require('@mapbox/mapbox-sdk/services/geocoding');
import config from '../config';

// Create clients with fallback for missing token
let mapboxClient: any = null;
let geocodingClient: any = null;

try {
  if (config.mapbox.accessToken) {
    mapboxClient = new MapboxClient({ accessToken: config.mapbox.accessToken });
    geocodingClient = new GeoCodingService(mapboxClient);
  }
} catch (error) {
  console.warn('Mapbox client initialization failed:', error);
}

export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  if (!geocodingClient) {
    console.warn('Mapbox geocoding not available, returning mock coordinates');
    // Return mock coordinates for demo purposes
    return { lat: 40.7128, lng: -74.0060 }; // New York City
  }

  try {
    const response = await geocodingClient
      .forwardGeocode({
        query: locationName,
        limit: 1,
        types: ['place', 'locality', 'neighborhood', 'address']
      })
      .send();

    const match = response.body.features[0];
    if (!match) {
      console.error('No location found for:', locationName);
      return null;
    }

    const [lng, lat] = match.center;
    return { lat, lng };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!geocodingClient) {
    console.warn('Mapbox geocoding not available, returning mock location');
    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

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


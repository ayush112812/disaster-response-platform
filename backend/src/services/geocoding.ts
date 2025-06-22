const MapboxClient = require('@mapbox/mapbox-sdk');
const GeoCodingService = require('@mapbox/mapbox-sdk/services/geocoding');
import config from '../config';

const mapboxClient = new MapboxClient({ accessToken: config.mapbox.accessToken });
const geocodingClient = new GeoCodingService(mapboxClient);

export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
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


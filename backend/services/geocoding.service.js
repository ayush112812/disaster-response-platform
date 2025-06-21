const axios = require('axios');
const config = require('../config');
const { getFromCache, setCache } = require('./db.service');

class GeocodingService {
  constructor() {
    this.providers = ['mapbox', 'nominatim'];
    this.currentProviderIndex = 0;
  }

  async geocode(locationName) {
    if (!locationName) return null;
    
    try {
      // Check cache first
      const cacheKey = `geocode:${locationName.toLowerCase().trim()}`;
      const cached = await getFromCache(cacheKey);
      if (cached) return cached;

      // Try each provider until one succeeds
      let result = null;
      let lastError = null;
      
      for (let i = 0; i < this.providers.length; i++) {
        const provider = this.providers[this.currentProviderIndex];
        
        try {
          switch (provider) {
            case 'mapbox':
              if (config.mapbox?.accessToken) {
                result = await this._geocodeWithMapbox(locationName);
              }
              break;
              
            case 'nominatim':
              result = await this._geocodeWithNominatim(locationName);
              break;
          }
          
          if (result) {
            // Cache the successful result
            await setCache(cacheKey, result);
            return result;
          }
        } catch (error) {
          console.error(`Geocoding with ${provider} failed:`, error.message);
          lastError = error;
          // Try next provider
          this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        }
      }
      
      // All providers failed
      throw lastError || new Error('All geocoding providers failed');
      
    } catch (error) {
      console.error('Error in geocoding service:', error);
      return null;
    }
  }

  async _geocodeWithMapbox(locationName) {
    const accessToken = config.mapbox?.accessToken;
    if (!accessToken) {
      throw new Error('Mapbox access token not configured');
    }
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json`;
    const params = {
      access_token: accessToken,
      limit: 1,
      types: 'place,locality,neighborhood,address'
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data?.features?.length > 0) {
      const [lng, lat] = response.data.features[0].center;
      return { lat, lng, source: 'mapbox' };
    }
    
    return null;
  }

  async _geocodeWithNominatim(locationName) {
    const url = 'https://nominatim.openstreetmap.org/search';
    const params = {
      q: locationName,
      format: 'json',
      limit: 1,
      addressdetails: 1
    };
    
    // Respect Nominatim's usage policy with a user agent
    const headers = {
      'User-Agent': 'DisasterResponsePlatform/1.0 (your-email@example.com)'
    };
    
    const response = await axios.get(url, { params, headers });
    
    if (response.data?.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        source: 'nominatim'
      };
    }
    
    return null;
  }
}

module.exports = new GeocodingService();

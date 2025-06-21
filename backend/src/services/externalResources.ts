import axios from 'axios';
import { supabase } from './supabase';
import config from '../config';

// External resource types that can be fetched from mapping services
export interface ExternalResource {
  id: string;
  name: string;
  type: 'hospital' | 'pharmacy' | 'police' | 'fire_station' | 'school' | 'shelter' | 'gas_station';
  location_name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance?: number;
  contact?: {
    phone?: string;
    website?: string;
  };
  source: 'mapbox' | 'overpass' | 'mock';
}

// Cache duration for external resources (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Fetch hospitals and medical facilities near a disaster location
 */
export async function fetchNearbyHospitals(lat: number, lng: number, radius: number = 10000): Promise<ExternalResource[]> {
  const cacheKey = `hospitals_${lat}_${lng}_${radius}`;
  
  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('cache')
      .select('value')
      .eq('key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      return cached.value.hospitals;
    }
    
    // Try Mapbox Places API first
    let hospitals: ExternalResource[] = [];
    
    if (config.mapbox?.accessToken) {
      hospitals = await fetchMapboxPlaces(lat, lng, radius, 'hospital');
    }
    
    // Fallback to OpenStreetMap Overpass API
    if (hospitals.length === 0) {
      hospitals = await fetchOverpassPlaces(lat, lng, radius, 'hospital');
    }
    
    // Fallback to mock data if all external services fail
    if (hospitals.length === 0) {
      hospitals = getMockHospitals(lat, lng);
    }
    
    // Cache the results
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: { hospitals },
        expires_at: new Date(Date.now() + CACHE_DURATION).toISOString()
      });
    
    return hospitals;
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    return getMockHospitals(lat, lng);
  }
}

/**
 * Fetch emergency services (police, fire stations) near a disaster
 */
export async function fetchEmergencyServices(lat: number, lng: number, radius: number = 10000): Promise<ExternalResource[]> {
  const cacheKey = `emergency_${lat}_${lng}_${radius}`;
  
  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('cache')
      .select('value')
      .eq('key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      return cached.value.services;
    }
    
    let services: ExternalResource[] = [];
    
    // Fetch police stations and fire stations
    if (config.mapbox?.accessToken) {
      const [police, fireStations] = await Promise.all([
        fetchMapboxPlaces(lat, lng, radius, 'police'),
        fetchMapboxPlaces(lat, lng, radius, 'fire_station')
      ]);
      services = [...police, ...fireStations];
    }
    
    // Fallback to mock data
    if (services.length === 0) {
      services = getMockEmergencyServices(lat, lng);
    }
    
    // Cache the results
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: { services },
        expires_at: new Date(Date.now() + CACHE_DURATION).toISOString()
      });
    
    return services;
  } catch (error) {
    console.error('Error fetching emergency services:', error);
    return getMockEmergencyServices(lat, lng);
  }
}

/**
 * Fetch places using Mapbox Places API
 */
async function fetchMapboxPlaces(lat: number, lng: number, radius: number, type: string): Promise<ExternalResource[]> {
  try {
    const accessToken = config.mapbox?.accessToken;
    if (!accessToken) {
      throw new Error('Mapbox access token not configured');
    }
    
    // Map our types to Mapbox categories
    const categoryMap: Record<string, string> = {
      'hospital': 'hospital',
      'pharmacy': 'pharmacy',
      'police': 'police',
      'fire_station': 'fire_station',
      'school': 'school',
      'gas_station': 'gas_station'
    };
    
    const category = categoryMap[type] || type;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${category}.json`;
    
    const response = await axios.get(url, {
      params: {
        access_token: accessToken,
        proximity: `${lng},${lat}`,
        limit: 10,
        radius: radius,
        types: 'poi'
      }
    });
    
    return response.data.features.map((feature: any, index: number) => ({
      id: `mapbox_${type}_${index}`,
      name: feature.text || feature.place_name,
      type: type as any,
      location_name: feature.place_name,
      coordinates: {
        lat: feature.center[1],
        lng: feature.center[0]
      },
      source: 'mapbox' as const
    }));
  } catch (error) {
    console.error('Mapbox Places API error:', error);
    return [];
  }
}

/**
 * Fetch places using OpenStreetMap Overpass API
 */
async function fetchOverpassPlaces(lat: number, lng: number, radius: number, type: string): Promise<ExternalResource[]> {
  try {
    // Map our types to OSM amenity tags
    const amenityMap: Record<string, string> = {
      'hospital': 'hospital',
      'pharmacy': 'pharmacy',
      'police': 'police',
      'fire_station': 'fire_station',
      'school': 'school',
      'gas_station': 'fuel'
    };
    
    const amenity = amenityMap[type] || type;
    const radiusKm = radius / 1000;
    
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="${amenity}"](around:${radius},${lat},${lng});
        way["amenity"="${amenity}"](around:${radius},${lat},${lng});
        relation["amenity"="${amenity}"](around:${radius},${lat},${lng});
      );
      out center meta;
    `;
    
    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
    return response.data.elements.map((element: any, index: number) => ({
      id: `osm_${type}_${element.id}`,
      name: element.tags?.name || `${type.replace('_', ' ')} ${index + 1}`,
      type: type as any,
      location_name: element.tags?.name || `${element.lat}, ${element.lon}`,
      coordinates: {
        lat: element.lat || element.center?.lat,
        lng: element.lon || element.center?.lon
      },
      contact: {
        phone: element.tags?.phone,
        website: element.tags?.website
      },
      source: 'overpass' as const
    })).filter(resource => resource.coordinates.lat && resource.coordinates.lng);
  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
}

/**
 * Mock hospital data for fallback
 */
function getMockHospitals(lat: number, lng: number): ExternalResource[] {
  return [
    {
      id: 'mock_hospital_1',
      name: 'Central Emergency Hospital',
      type: 'hospital',
      location_name: 'Downtown Medical District',
      coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
      distance: 1200,
      contact: { phone: '555-0911', website: 'https://centralhospital.org' },
      source: 'mock'
    },
    {
      id: 'mock_hospital_2',
      name: 'Regional Medical Center',
      type: 'hospital',
      location_name: 'Medical Plaza',
      coordinates: { lat: lat - 0.015, lng: lng + 0.02 },
      distance: 2100,
      contact: { phone: '555-0922', website: 'https://regionalmed.org' },
      source: 'mock'
    },
    {
      id: 'mock_pharmacy_1',
      name: '24/7 Emergency Pharmacy',
      type: 'pharmacy',
      location_name: 'Main Street',
      coordinates: { lat: lat + 0.005, lng: lng - 0.01 },
      distance: 800,
      contact: { phone: '555-0933' },
      source: 'mock'
    }
  ];
}

/**
 * Mock emergency services data for fallback
 */
function getMockEmergencyServices(lat: number, lng: number): ExternalResource[] {
  return [
    {
      id: 'mock_police_1',
      name: 'Central Police Station',
      type: 'police',
      location_name: 'City Center',
      coordinates: { lat: lat + 0.008, lng: lng - 0.005 },
      distance: 900,
      contact: { phone: '911' },
      source: 'mock'
    },
    {
      id: 'mock_fire_1',
      name: 'Fire Station 12',
      type: 'fire_station',
      location_name: 'Emergency Services District',
      coordinates: { lat: lat - 0.01, lng: lng + 0.015 },
      distance: 1500,
      contact: { phone: '911' },
      source: 'mock'
    }
  ];
}

/**
 * Get comprehensive resources for a disaster location
 */
export async function getComprehensiveResources(lat: number, lng: number, radius: number = 10000): Promise<{
  hospitals: ExternalResource[];
  emergencyServices: ExternalResource[];
  total: number;
}> {
  try {
    const [hospitals, emergencyServices] = await Promise.all([
      fetchNearbyHospitals(lat, lng, radius),
      fetchEmergencyServices(lat, lng, radius)
    ]);
    
    return {
      hospitals,
      emergencyServices,
      total: hospitals.length + emergencyServices.length
    };
  } catch (error) {
    console.error('Error fetching comprehensive resources:', error);
    return {
      hospitals: getMockHospitals(lat, lng),
      emergencyServices: getMockEmergencyServices(lat, lng),
      total: 0
    };
  }
}

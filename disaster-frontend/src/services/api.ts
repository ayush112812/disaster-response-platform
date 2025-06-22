import axios, { AxiosError, AxiosResponse } from 'axios';

// Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Disaster {
  id: string;
  title: string;
  description: string;
  location_name: string;
  location?: string; // PostGIS geography point
  latitude?: number;
  longitude?: number;
  type?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'reported' | 'verified' | 'in_progress' | 'resolved' | 'false_alarm';
  tags: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;

}

export interface Resource {
  id: string;
  disaster_id: string;
  name: string;
  description: string;
  location_name?: string;
  location?: string;
  type: 'food' | 'water' | 'shelter' | 'medical' | 'clothing' | 'other';
  quantity: number;
  contact_info?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  disaster_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  metadata?: any;
  created_at: string;
}

export interface SocialMediaPost {
  id: string;
  text: string;
  username: string;
  platform: string;
  timestamp: string;
  location?: string;
  mediaUrls?: string[];
  tags?: string[];
  isPriority?: boolean;
  type?: 'need' | 'offer' | 'alert' | 'general';
  content?: string; // Alternative field name used in backend
  user?: string; // Alternative field name used in backend
  isUrgent?: boolean; // Alternative field name used in backend
}

export interface OfficialUpdate {
  id: string;
  disaster_id?: string;
  source: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  published_at?: string;
  timestamp?: string;
  relevance?: number;
  created_at?: string;
  updated_at?: string;
}



export interface ApiError {
  message: string;
  status?: number;
  details?: Record<string, string>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const FULL_API_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

// Check if we're in production without a backend URL
const isProductionWithoutBackend = import.meta.env.MODE === 'production' && !import.meta.env.VITE_API_URL;

console.log('🔧 API Configuration:', {
  API_URL,
  FULL_API_URL,
  MODE: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  isProductionWithoutBackend
});

export const api = axios.create({
  baseURL: FULL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string> }>) => {
    if (error.response) {
      // Handle HTTP errors
      const apiError: ApiError = {
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        details: error.response.data?.errors,
      };
      return Promise.reject(apiError);
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({
        message: 'No response from server. Please check your connection.',
      });
    } else {
      // Something happened in setting up the request
      return Promise.reject({ message: error.message });
    }
  }
);

// Mock data generators
const generateMockDisasters = (): Disaster[] => {
  return [
    {
      id: '1',
      title: 'Hurricane Milton Aftermath',
      description: 'Category 4 hurricane caused widespread flooding and power outages across the Gulf Coast region.',
      location_name: 'Tampa Bay, Florida',
      latitude: 27.9506,
      longitude: -82.4572,
      type: 'hurricane',
      severity: 'high',
      status: 'in_progress',
      tags: ['hurricane', 'flooding', 'power-outage'],
      owner_id: 'user1',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Wildfire in Northern California',
      description: 'Fast-moving wildfire threatens residential areas. Evacuation orders in effect.',
      location_name: 'Napa Valley, California',
      latitude: 38.5025,
      longitude: -122.2654,
      type: 'wildfire',
      severity: 'high',
      status: 'verified',
      tags: ['wildfire', 'evacuation', 'air-quality'],
      owner_id: 'user2',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      title: 'Flash Flood Warning',
      description: 'Heavy rainfall causing flash flooding in urban areas. Multiple road closures reported.',
      location_name: 'Austin, Texas',
      latitude: 30.2672,
      longitude: -97.7431,
      type: 'flood',
      severity: 'medium',
      status: 'reported',
      tags: ['flood', 'road-closure', 'heavy-rain'],
      owner_id: 'user3',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString()
    }
  ];
};

// API functions
export const getDisasters = async (): Promise<Disaster[]> => {
  console.log('🔍 Making request to:', `${FULL_API_URL}/disasters`);

  // If in production without backend, return mock data immediately
  if (isProductionWithoutBackend) {
    console.log('🎭 Using mock data (production without backend)');
    return generateMockDisasters();
  }

  try {
    const response = await api.get<Disaster[]>('/disasters');
    console.log('✅ Response received:', response.data);
    return response.data;
  } catch (error) {
    console.warn('❌ Error in getDisasters, falling back to mock data:', error);
    return generateMockDisasters();
  }
};

export const getDisaster = async (id: string): Promise<Disaster> => {
  console.log('🔍 Making request to:', `${FULL_API_URL}/disasters/${id}`);
  try {
    const response = await api.get<Disaster>(`/disasters/${id}`);
    console.log('✅ Disaster response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error in getDisaster:', error);
    throw error;
  }
};

export const createDisaster = async (disasterData: Omit<Disaster, 'id' | 'created_at' | 'updated_at'>): Promise<Disaster> => {
  console.log('🔍 Creating disaster:', disasterData);
  try {
    const response = await api.post<Disaster>('/disasters', disasterData);
    console.log('✅ Disaster created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating disaster:', error);
    throw error;
  }
};



export const updateDisaster = async (id: string, data: Partial<Disaster>): Promise<Disaster> => {
  console.log('🔍 Updating disaster:', id, data);
  try {
    const response = await api.put<Disaster>(`/disasters/${id}`, data);
    console.log('✅ Disaster updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating disaster:', error);
    // Return mock updated data if API fails
    const mockUpdatedDisaster = {
      id,
      title: data.title || 'Updated Disaster',
      description: data.description || 'Updated description',
      location_name: data.location_name || 'Updated location',
      severity: data.severity || 'medium',
      status: data.status || 'active',
      tags: data.tags || [],
      owner_id: 'mockUser',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updated_at: new Date().toISOString()
    } as Disaster;

    console.log('🔄 Returning mock updated disaster:', mockUpdatedDisaster);
    return mockUpdatedDisaster;
  }
};

export const deleteDisaster = async (id: string): Promise<void> => {
  await api.delete(`/disasters/${id}`);
};

// Add authentication related API calls
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

// Resource API functions
export const getResources = async (disasterId: string): Promise<Resource[]> => {
  const response = await api.get<Resource[]>(`/disasters/${disasterId}/resources`);
  return response.data;
};

export const createResource = async (disasterId: string, data: Omit<Resource, 'id' | 'disaster_id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Resource> => {
  const response = await api.post<Resource>(`/disasters/${disasterId}/resources`, data);
  return response.data;
};

// Social Media API functions
export const getSocialMediaPosts = async (
  disasterId: string,
  options?: {
    limit?: number;
    type?: 'need' | 'offer' | 'alert' | 'general';
    urgent?: boolean;
    keywords?: string[];
  }
): Promise<{
  posts: SocialMediaPost[];
  total: number;
  priorityCount: number;
  typeCounts?: {
    need: number;
    offer: number;
    alert: number;
    general: number;
  };
}> => {
  const params: Record<string, any> = {};
  if (options?.limit) params.limit = options.limit;
  if (options?.type) params.type = options.type;
  if (options?.urgent !== undefined) params.urgent = options.urgent;
  if (options?.keywords?.length) params.keywords = options.keywords.join(',');

  const response = await api.get(`/social-media/disasters/${disasterId}/social-media`, {
    params
  });
  return response.data;
};

export const getMockSocialMediaPosts = async (keywords?: string, limit?: number): Promise<{ posts: SocialMediaPost[]; total: number; priorityCount: number }> => {
  const response = await api.get('/social-media/mock-social-media', {
    params: { keywords, limit }
  });
  return response.data;
};

// Official Updates API functions
export const getOfficialUpdates = async (disasterId: string, limit?: number): Promise<{ updates: OfficialUpdate[]; total: number }> => {
  const response = await api.get(`/official-updates/disasters/${disasterId}/official-updates`, {
    params: { limit }
  });
  return response.data;
};

// Geocoding API functions
export const geocodeLocation = async (locationName: string): Promise<{ locationName: string; coordinates: Coordinates }> => {
  // If in production without backend, return mock coordinates
  if (isProductionWithoutBackend) {
    console.log('🎭 Using mock geocoding data (production without backend)');
    // Return mock coordinates based on common location names
    const mockCoordinates: Record<string, Coordinates> = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
      'philadelphia': { lat: 39.9526, lng: -75.1652 },
      'san antonio': { lat: 29.4241, lng: -98.4936 },
      'san diego': { lat: 32.7157, lng: -117.1611 },
      'dallas': { lat: 32.7767, lng: -96.7970 },
      'san jose': { lat: 37.3382, lng: -121.8863 },
      'austin': { lat: 30.2672, lng: -97.7431 },
      'tampa': { lat: 27.9506, lng: -82.4572 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'atlanta': { lat: 33.7490, lng: -84.3880 },
      'boston': { lat: 42.3601, lng: -71.0589 }
    };

    const normalizedLocation = locationName.toLowerCase();
    const foundLocation = Object.keys(mockCoordinates).find(key =>
      normalizedLocation.includes(key) || key.includes(normalizedLocation)
    );

    if (foundLocation) {
      return { locationName, coordinates: mockCoordinates[foundLocation] };
    }

    // Default to New York if no match found
    return { locationName, coordinates: { lat: 40.7128, lng: -74.0060 } };
  }

  try {
    const response = await api.post('/geocoding/geocode', { locationName });
    return response.data;
  } catch (error) {
    console.warn('❌ Error in geocodeLocation, falling back to mock data:', error);
    // Fallback to New York coordinates
    return { locationName, coordinates: { lat: 40.7128, lng: -74.0060 } };
  }
};

export const extractLocation = async (text: string): Promise<{ extractedLocation: string; coordinates?: Coordinates }> => {
  const response = await api.post('/geocoding/extract-location', { text });
  return response.data;
};

// Geospatial API functions
export const getNearbyDisasters = async (lat: number, lng: number, radius?: number): Promise<{ disasters: Disaster[]; count: number }> => {
  const response = await api.get('/geospatial/disasters/nearby', {
    params: { lat, lng, radius }
  });
  return response.data;
};

const generateMockResources = (lat: number, lng: number): Resource[] => {
  return [
    {
      id: '1',
      disaster_id: '1',
      name: 'Emergency Shelter - Red Cross',
      description: 'Temporary shelter with food and medical assistance available 24/7',
      location_name: 'Tampa Community Center',
      type: 'shelter',
      quantity: 200,
      contact_info: { phone: '(813) 555-0123', email: 'shelter@redcross.org' },
      created_by: 'redcross',
      created_at: new Date(Date.now() - 43200000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      disaster_id: '1',
      name: 'Food Distribution Center',
      description: 'Free meals and emergency food supplies for hurricane victims',
      location_name: 'Tampa Bay Food Bank',
      type: 'food',
      quantity: 500,
      contact_info: { phone: '(813) 555-0456', email: 'help@tampafoodbank.org' },
      created_by: 'foodbank',
      created_at: new Date(Date.now() - 21600000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '3',
      disaster_id: '2',
      name: 'Mobile Medical Unit',
      description: 'Emergency medical care and prescription refills',
      location_name: 'Napa Valley Hospital Parking',
      type: 'medical',
      quantity: 50,
      contact_info: { phone: '(707) 555-0789', email: 'emergency@napahealth.org' },
      created_by: 'hospital',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: '4',
      disaster_id: '3',
      name: 'Clean Water Distribution',
      description: 'Bottled water and water purification tablets',
      location_name: 'Austin Convention Center',
      type: 'water',
      quantity: 1000,
      contact_info: { phone: '(512) 555-0321', email: 'water@austinrelief.org' },
      created_by: 'city',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString()
    }
  ];
};

export const getNearbyResources = async (lat: number, lng: number, radius?: number, type?: string): Promise<{ resources: Resource[]; count: number }> => {
  // If in production without backend, return mock data immediately
  if (isProductionWithoutBackend) {
    console.log('🎭 Using mock resources data (production without backend)');
    const mockResources = generateMockResources(lat, lng);
    const filteredResources = type ? mockResources.filter(r => r.type === type) : mockResources;
    return { resources: filteredResources, count: filteredResources.length };
  }

  try {
    const response = await api.get('/resources', {
      params: { lat, lng, radius, type }
    });
    return response.data;
  } catch (error) {
    console.warn('❌ Error in getNearbyResources, falling back to mock data:', error);
    const mockResources = generateMockResources(lat, lng);
    const filteredResources = type ? mockResources.filter(r => r.type === type) : mockResources;
    return { resources: filteredResources, count: filteredResources.length };
  }
};

// Image Verification API functions
export const verifyImage = async (disasterId: string, imageUrl: string): Promise<{ isAuthentic: boolean; confidence: number; analysis: string; reportId: string }> => {
  const response = await api.post(`/disasters/${disasterId}/verify-image`, { imageUrl });
  return response.data;
};



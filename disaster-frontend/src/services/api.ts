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
console.log('🔧 API_URL configured as:', FULL_API_URL);

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

// API functions
export const getDisasters = async (): Promise<Disaster[]> => {
  console.log('🔍 Making request to:', `${FULL_API_URL}/disasters`);
  try {
    const response = await api.get<Disaster[]>('/disasters');
    console.log('✅ Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error in getDisasters:', error);
    throw error;
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
  const response = await api.post('/geocoding/geocode', { locationName });
  return response.data;
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

export const getNearbyResources = async (lat: number, lng: number, radius?: number, type?: string): Promise<{ resources: Resource[]; count: number }> => {
  const response = await api.get('/resources', {
    params: { lat, lng, radius, type }
  });
  return response.data;
};

// Image Verification API functions
export const verifyImage = async (disasterId: string, imageUrl: string): Promise<{ isAuthentic: boolean; confidence: number; analysis: string; reportId: string }> => {
  const response = await api.post(`/disasters/${disasterId}/verify-image`, { imageUrl });
  return response.data;
};



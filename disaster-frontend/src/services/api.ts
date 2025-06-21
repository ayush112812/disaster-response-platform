import axios, { AxiosError, AxiosResponse } from 'axios';

// Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Disaster {
  id: string;
  name: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved' | 'mitigated';
  startDate: string;
  endDate?: string;
  coordinates?: Coordinates;
  affectedAreas?: string[];
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: Record<string, string>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
  const response = await api.get<Disaster[]>('/disasters');
  return response.data;
};

export const getDisaster = async (id: string): Promise<Disaster> => {
  const response = await api.get<Disaster>(`/disasters/${id}`);
  return response.data;
};

export const createDisaster = async (data: Omit<Disaster, 'id' | 'createdAt' | 'updatedAt'>): Promise<Disaster> => {
  const response = await api.post<Disaster>('/disasters', data);
  return response.data;
};

export const updateDisaster = async (id: string, data: Partial<Disaster>): Promise<Disaster> => {
  const response = await api.put<Disaster>(`/disasters/${id}`, data);
  return response.data;
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

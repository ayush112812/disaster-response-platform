// Core Types for Disaster Response Platform

export interface Disaster {
  id: string;
  title: string;
  description: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved' | 'monitoring';
  tags: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
  image_urls?: string[];
}

export interface Resource {
  id: string;
  disaster_id?: string;
  name: string;
  type: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  status: 'available' | 'deployed' | 'unavailable';
  quantity?: number;
  description?: string;
  contact_info?: string;
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location_name?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'contributor' | 'viewer';
  created_at: string;
}

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'mock';
  content: string;
  author: string;
  url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  location?: string;
  created_at: string;
  disaster_id?: string;
}

export interface OfficialUpdate {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  disaster_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export interface VerificationResult {
  isValid: boolean;
  confidence: number;
  analysis: string;
  reportId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export type CreateDisasterData = Omit<Disaster, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDisasterData = Partial<CreateDisasterData>;
export type CreateResourceData = Omit<Resource, 'id' | 'created_at' | 'updated_at'>;
export type CreateReportData = Omit<Report, 'id' | 'created_at' | 'updated_at' | 'verification_status'>;

// WebSocket Event Types
export interface WebSocketEvents {
  disaster_created: Disaster;
  disaster_updated: Disaster;
  disaster_deleted: { id: string };
  resource_created: Resource;
  resource_updated: Resource;
  resource_deleted: { id: string };
  social_media_updated: SocialMediaPost[];
  official_update_created: OfficialUpdate;
}

// Map Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

// Filter Types
export interface DisasterFilters {
  severity?: string[];
  status?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export interface ResourceFilters {
  type?: string[];
  status?: string[];
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

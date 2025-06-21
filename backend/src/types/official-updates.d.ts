declare module '../services/officialUpdates' {
  import { Request } from 'express';

  export interface OfficialUpdate {
    id: string;
    disaster_id: string;
    source: string;
    title: string;
    description: string;
    url: string;
    published_at: string;
    created_at: string;
    updated_at: string;
  }

  export interface OfficialUpdateFilters {
    source?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }

  export function scrapeOfficialUpdates(disasterId: string, filters?: OfficialUpdateFilters): Promise<OfficialUpdate[]>;
  export function refreshOfficialUpdates(disasterId: string): Promise<OfficialUpdate[]>;
  export function getCachedOfficialUpdates(disasterId: string, filters?: OfficialUpdateFilters): Promise<OfficialUpdate[]>;
}

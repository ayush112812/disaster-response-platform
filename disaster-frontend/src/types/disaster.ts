export interface Disaster {
  id: string;
  name: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved' | 'monitoring';
  reportedAt: string;
  updatedAt: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type CreateDisasterDto = Omit<Disaster, 'id' | 'reportedAt' | 'updatedAt'>;
export type UpdateDisasterDto = Partial<CreateDisasterDto>;

/**
 * Hospital DTOs
 * 
 * Data Transfer Objects for Hospital-related API responses.
 */

export interface HospitalDTO {
  _id: string;
  name: string;
  address: string;
  organization: {
    type: 'CIUSSS' | 'CISSS' | 'CUSM';
    name: string;
    region: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  specialties?: string[];
  capacity?: {
    totalBeds?: number;
    icuBeds?: number;
    emergencyBeds?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HospitalListDTO {
  hospitals: HospitalDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface HospitalStatsDTO {
  total: number;
  active: number;
  inactive: number;
  byOrganization: {
    [orgType: string]: number;
  };
  byRegion: {
    [region: string]: number;
  };
}

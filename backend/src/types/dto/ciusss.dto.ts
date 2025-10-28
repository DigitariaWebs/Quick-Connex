/**
 * CIUSSS DTOs
 * 
 * Data Transfer Objects for CIUSSS-related API responses.
 */

export interface CIUSSSDTO {
  _id: string;
  code: string;
  name: string;
  region?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CIUSSSListDTO {
  ciusss: CIUSSSDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CIUSSSStatsDTO {
  total: number;
  active: number;
  inactive: number;
  byRegion: {
    [region: string]: number;
  };
}

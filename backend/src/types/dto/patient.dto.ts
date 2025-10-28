/**
 * Patient DTOs
 * 
 * Data Transfer Objects for Patient-related API responses.
 */

export interface PatientDTO {
  _id: string;
  firstName: string;
  lastName: string;
  age: number;
  dossierNumber: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  lastModifiedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientListDTO {
  patients: PatientDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PatientStatsDTO {
  total: number;
  active: number;
  inactive: number;
  newThisWeek: number;
  newThisMonth: number;
}

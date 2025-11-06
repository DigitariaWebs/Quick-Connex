/**
 * User DTO Types
 * 
 * Data Transfer Objects for user-related API responses.
 */

import { User, UserStats, UserActivity } from '../auth/user.types';

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserStatsResponse {
  stats: UserStats;
  lastUpdated: Date;
}

export interface UserActivityResponse {
  activities: UserActivity[];
  total: number;
  page: number;
  limit: number;
}


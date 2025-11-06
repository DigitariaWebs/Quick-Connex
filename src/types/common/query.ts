/**
 * Query Types
 * 
 * Shared query parameter types used across the application.
 */

export interface SortParams {
  sort: string;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | string[] | undefined;
}

export interface SearchParams {
  query: string;
  fields?: string[];
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface IncludeParams {
  fields: string[];
  populate: string[];
}

export interface QueryOptions {
  retry?: {
    attempts?: number;
    backoff?: 'linear' | 'exponential' | 'fixed';
    delay?: number;
    maxDelay?: number;
    jitter?: boolean;
  };
  monitor?: boolean;
  timeout?: number;
  lean?: boolean;
  populate?: any;
  select?: string | Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1> | string;
  limit?: number;
  skip?: number;
  session?: any;
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  writeConcern?: any;
  hint?: any;
  comment?: string;
  maxTimeMS?: number;
  collation?: any;
  allowDiskUse?: boolean;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}



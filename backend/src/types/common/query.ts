/**
 * Query Types
 * 
 * Types for database queries, filters, and operations.
 */

export interface QueryFilter {
  [key: string]: any;
}

export interface SortOptions {
  [key: string]: 1 | -1 | 'asc' | 'desc';
}

export interface PopulateOptions {
  path: string;
  select?: string;
  model?: string;
  match?: any;
  options?: any;
  populate?: PopulateOptions | PopulateOptions[];
}

export interface QueryOptions {
  select?: string | string[];
  sort?: SortOptions;
  limit?: number;
  skip?: number;
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
  session?: any; // Mongoose session
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  writeConcern?: any;
  hint?: any;
  comment?: string;
  maxTimeMS?: number;
  collation?: any;
  allowDiskUse?: boolean;
}

export interface FilterBuilder {
  build(): QueryFilter;
  and(condition: any): FilterBuilder;
  or(condition: any): FilterBuilder;
  not(condition: any): FilterBuilder;
  exists(field: string, exists?: boolean): FilterBuilder;
  in(field: string, values: any[]): FilterBuilder;
  nin(field: string, values: any[]): FilterBuilder;
  eq(field: string, value: any): FilterBuilder;
  ne(field: string, value: any): FilterBuilder;
  gt(field: string, value: any): FilterBuilder;
  gte(field: string, value: any): FilterBuilder;
  lt(field: string, value: any): FilterBuilder;
  lte(field: string, value: any): FilterBuilder;
  regex(field: string, pattern: string, options?: string): FilterBuilder;
  text(search: string, options?: any): FilterBuilder;
  near(field: string, coordinates: [number, number], maxDistance?: number): FilterBuilder;
  within(field: string, geometry: any): FilterBuilder;
}

export interface SearchOptions {
  text?: string;
  fields?: string[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface GeoQuery {
  type: 'point' | 'polygon' | 'lineString';
  coordinates: number[] | number[][];
  maxDistance?: number;
  minDistance?: number;
}

export interface FacetOptions {
  [key: string]: any;
}

export interface GroupByOptions {
  _id: any;
  [key: string]: any;
}

import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Query Parameters Utilities
 * 
 * Parse and validate URL query parameters with type safety.
 * Provides common patterns for pagination, sorting, filtering, and search.
 */

// ===== TYPES =====

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

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

// ===== DEFAULT VALUES =====

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100
};

const DEFAULT_SORT = {
  sort: 'createdAt',
  order: 'desc' as const
};

// ===== PAGINATION =====

/**
 * Parse pagination parameters from URL search params
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    DEFAULT_PAGINATION.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || DEFAULT_PAGINATION.limit.toString(), 10))
  );
  
  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

/**
 * Parse pagination with Zod validation
 */
export function parsePaginationWithValidation(
  searchParams: URLSearchParams,
  schema?: z.ZodSchema
): PaginationParams {
  const rawParams = {
    page: searchParams.get('page'),
    limit: searchParams.get('limit')
  };
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      // Return defaults if validation fails
      return {
        page: DEFAULT_PAGINATION.page,
        limit: DEFAULT_PAGINATION.limit,
        offset: 0
      };
    }
  }
  
  return parsePagination(searchParams);
}

// ===== SORTING =====

/**
 * Parse sort parameters from URL search params
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[] = ['createdAt', 'updatedAt', 'name', 'email']
): SortParams {
  const sort = searchParams.get('sort') || DEFAULT_SORT.sort;
  const order = (searchParams.get('order') || DEFAULT_SORT.order) as 'asc' | 'desc';
  
  // Validate sort field
  const validSort = allowedFields.includes(sort) ? sort : DEFAULT_SORT.sort;
  
  return {
    sort: validSort,
    order: ['asc', 'desc'].includes(order) ? order : DEFAULT_SORT.order
  };
}

/**
 * Parse sort with validation
 */
export function parseSortParamsWithValidation(
  searchParams: URLSearchParams,
  allowedFields: string[],
  schema?: z.ZodSchema
): SortParams {
  const rawParams = {
    sort: searchParams.get('sort'),
    order: searchParams.get('order')
  };
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      return DEFAULT_SORT;
    }
  }
  
  return parseSortParams(searchParams, allowedFields);
}

// ===== FILTERING =====

/**
 * Parse filter parameters from URL search params
 */
export function parseFilterParams(
  searchParams: URLSearchParams,
  allowedFields: string[] = []
): FilterParams {
  const filters: FilterParams = {};
  
  for (const [key, value] of searchParams.entries()) {
    // Skip pagination and sort params
    if (['page', 'limit', 'sort', 'order', 'search', 'query'].includes(key)) {
      continue;
    }
    
    // Only include allowed fields if specified
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      continue;
    }
    
    // Handle multiple values for the same key
    if (filters[key]) {
      if (Array.isArray(filters[key])) {
        (filters[key] as string[]).push(value);
      } else {
        filters[key] = [filters[key] as string, value];
      }
    } else {
      filters[key] = value;
    }
  }
  
  return filters;
}

/**
 * Parse filters with validation
 */
export function parseFilterParamsWithValidation(
  searchParams: URLSearchParams,
  allowedFields: string[],
  schema?: z.ZodSchema
): FilterParams {
  const rawParams = Object.fromEntries(searchParams.entries());
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      return {};
    }
  }
  
  return parseFilterParams(searchParams, allowedFields);
}

// ===== SEARCH =====

/**
 * Parse search parameters from URL search params
 */
export function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  const query = searchParams.get('search') || searchParams.get('query') || '';
  const fields = searchParams.get('fields')?.split(',') || [];
  
  return {
    query: query.trim(),
    fields: fields.length > 0 ? fields : undefined
  };
}

/**
 * Parse search with validation
 */
export function parseSearchParamsWithValidation(
  searchParams: URLSearchParams,
  schema?: z.ZodSchema
): SearchParams {
  const rawParams = {
    search: searchParams.get('search'),
    query: searchParams.get('query'),
    fields: searchParams.get('fields')
  };
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      return { query: '' };
    }
  }
  
  return parseSearchParams(searchParams);
}

// ===== DATE RANGE =====

/**
 * Parse date range parameters from URL search params
 */
export function parseDateRange(searchParams: URLSearchParams): DateRangeParams {
  const startDate = searchParams.get('startDate') || searchParams.get('start');
  const endDate = searchParams.get('endDate') || searchParams.get('end');
  
  return {
    startDate: startDate || undefined,
    endDate: endDate || undefined
  };
}

/**
 * Parse date range with validation
 */
export function parseDateRangeWithValidation(
  searchParams: URLSearchParams,
  schema?: z.ZodSchema
): DateRangeParams {
  const rawParams = {
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate')
  };
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      return {};
    }
  }
  
  return parseDateRange(searchParams);
}

// ===== FIELD SELECTION =====

/**
 * Parse include/select parameters from URL search params
 */
export function parseIncludeFields(searchParams: URLSearchParams): IncludeParams {
  const fields = searchParams.get('fields')?.split(',').filter(Boolean) || [];
  const populate = searchParams.get('populate')?.split(',').filter(Boolean) || [];
  
  return {
    fields,
    populate
  };
}

/**
 * Parse include fields with validation
 */
export function parseIncludeFieldsWithValidation(
  searchParams: URLSearchParams,
  allowedFields: string[] = [],
  allowedPopulate: string[] = [],
  schema?: z.ZodSchema
): IncludeParams {
  const rawParams = {
    fields: searchParams.get('fields'),
    populate: searchParams.get('populate')
  };
  
  if (schema) {
    const result = schema.safeParse(rawParams);
    if (!result.success) {
      return { fields: [], populate: [] };
    }
  }
  
  const result = parseIncludeFields(searchParams);
  
  // Filter by allowed fields if specified
  if (allowedFields.length > 0) {
    result.fields = result.fields.filter(field => allowedFields.includes(field));
  }
  
  if (allowedPopulate.length > 0) {
    result.populate = result.populate.filter(field => allowedPopulate.includes(field));
  }
  
  return result;
}

// ===== COMPREHENSIVE PARSING =====

/**
 * Parse all common query parameters at once
 */
export function parseQueryParams(
  request: NextRequest,
  options: {
    allowedSortFields?: string[];
    allowedFilterFields?: string[];
    allowedPopulateFields?: string[];
    schema?: z.ZodSchema;
  } = {}
): {
  pagination: PaginationParams;
  sort: SortParams;
  filters: FilterParams;
  search: SearchParams;
  dateRange: DateRangeParams;
  include: IncludeParams;
} {
  const { searchParams } = new URL(request.url);
  
  return {
    pagination: parsePagination(searchParams),
    sort: parseSortParams(searchParams, options.allowedSortFields),
    filters: parseFilterParams(searchParams, options.allowedFilterFields),
    search: parseSearchParams(searchParams),
    dateRange: parseDateRange(searchParams),
    include: parseIncludeFields(searchParams)
  };
}

// ===== MONGODB QUERY BUILDING =====

/**
 * Build MongoDB query from filter parameters
 */
export function buildMongoQuery(filters: FilterParams): Record<string, any> {
  const query: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      // Handle array values (e.g., status: ['active', 'pending'])
      query[key] = { $in: value };
    } else if (typeof value === 'string') {
      // Handle string values
      if (value.includes('*')) {
        // Wildcard search
        const regex = value.replace(/\*/g, '.*');
        query[key] = { $regex: regex, $options: 'i' };
      } else {
        query[key] = value;
      }
    }
  }
  
  return query;
}

/**
 * Build MongoDB sort object from sort parameters
 */
export function buildMongoSort(sort: SortParams): Record<string, 1 | -1> {
  return {
    [sort.sort]: sort.order === 'asc' ? 1 : -1
  };
}

/**
 * Build MongoDB text search query
 */
export function buildMongoTextSearch(
  search: SearchParams,
  textFields: string[] = ['name', 'description', 'content']
): Record<string, any> {
  if (!search.query) return {};
  
  if (search.fields && search.fields.length > 0) {
    // Search in specific fields
    const fieldQueries = search.fields.map(field => ({
      [field]: { $regex: search.query, $options: 'i' }
    }));
    
    return { $or: fieldQueries };
  } else {
    // Full text search
    return {
      $text: {
        $search: search.query,
        $caseSensitive: false
      }
    };
  }
}

/**
 * Build date range query for MongoDB
 */
export function buildDateRangeQuery(
  dateRange: DateRangeParams,
  field: string = 'createdAt'
): Record<string, any> {
  const query: Record<string, any> = {};
  
  if (dateRange.startDate || dateRange.endDate) {
    query[field] = {};
    
    if (dateRange.startDate) {
      query[field].$gte = new Date(dateRange.startDate);
    }
    
    if (dateRange.endDate) {
      query[field].$lte = new Date(dateRange.endDate);
    }
  }
  
  return query;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Combine multiple query objects
 */
export function combineQueries(...queries: Record<string, any>[]): Record<string, any> {
  return queries.reduce((acc, query) => ({ ...acc, ...query }), {});
}

/**
 * Remove empty values from query object
 */
export function cleanQuery(query: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Validate query parameters against schema
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: z.ZodSchema
): { success: true; data: any } | { success: false; errors: z.ZodError } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

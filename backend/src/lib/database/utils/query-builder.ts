/**
 * Query Builder Utilities
 * 
 * Utilities for building MongoDB queries, filters,
 * pagination, sorting, and population options.
 */

import { 
  QueryFilter, 
  SortOptions, 
  PopulateOptions,
  FilterBuilder,
  SearchOptions,
  GeoQuery
} from '../../../types/common/query';
import { PaginationParams, PaginationMeta } from '../../../types/common/pagination';
import { log } from '../../logging';
import { DEFAULT_SORT, FIELD_NAMES } from '../core/constants';

/**
 * Build MongoDB query from filters
 */
export function buildMongoQuery(filters: QueryFilter): any {
  const query: any = {};
  
  for (const [field, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Handle MongoDB operators
      query[field] = value;
    } else if (Array.isArray(value)) {
      // Handle array values
      if (value.length === 0) {
        query[field] = { $exists: false };
      } else {
        query[field] = { $in: value };
      }
    } else {
      // Handle primitive values
      query[field] = value;
    }
  }
  
  return query;
}

/**
 * Build MongoDB sort options
 */
export function buildMongoSort(sort: SortOptions | string): Record<string, 1 | -1> {
  if (typeof sort === 'string') {
    const parts = sort.split(':');
    if (parts.length !== 2) {
      return DEFAULT_SORT.CREATED_AT_DESC;
    }
    
    const [field, direction] = parts;
    if (!field || !direction) return DEFAULT_SORT.CREATED_AT_DESC;
    const sortValue: 1 | -1 = direction.toLowerCase() === 'desc' || direction === '-1' ? -1 : 1;
    const result: Record<string, 1 | -1> = {};
    result[field] = sortValue;
    return result;
  }
  
  if (typeof sort === 'object') {
    const result: Record<string, 1 | -1> = {};
    
    for (const [field, direction] of Object.entries(sort)) {
      if (typeof direction === 'number') {
        result[field] = direction === -1 ? -1 : 1;
      } else if (typeof direction === 'string') {
        const lowerDirection = direction.toLowerCase();
        result[field] = (lowerDirection === 'desc' || lowerDirection === '-1') ? -1 : 1;
      }
    }
    
    return Object.keys(result).length > 0 ? result : DEFAULT_SORT.CREATED_AT_DESC;
  }
  
  return DEFAULT_SORT.CREATED_AT_DESC;
}

/**
 * Build pagination parameters
 */
export function buildPaginationParams(params: PaginationParams): PaginationMeta {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = params.offset || ((page - 1) * limit);
  
  return {
    page,
    limit,
    offset,
    total: 0, // Will be set by the calling function
    totalPages: 0, // Will be calculated
    hasNext: false, // Will be calculated
    hasPrev: page > 1
  };
}

/**
 * Build date range query
 */
export function buildDateRangeQuery(
  field: string = FIELD_NAMES.CREATED_AT,
  startDate?: Date,
  endDate?: Date
): QueryFilter {
  const query: QueryFilter = {};
  
  if (startDate || endDate) {
    query[field] = {};
    
    if (startDate) {
      query[field].$gte = startDate;
    }
    
    if (endDate) {
      query[field].$lte = endDate;
    }
  }
  
  return query;
}

/**
 * Combine multiple queries
 */
export function combineQueries(...queries: QueryFilter[]): QueryFilter {
  const combined: QueryFilter = {};
  
  for (const query of queries) {
    Object.assign(combined, query);
  }
  
  return combined;
}

/**
 * Clean query by removing undefined/null values
 */
export function cleanQuery(query: QueryFilter): QueryFilter {
  const cleaned: QueryFilter = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedValue = cleanQuery(value);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value;
      } else if (!Array.isArray(value)) {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Filter Builder implementation
 */
export class FilterBuilderImpl implements FilterBuilder {
  private query: QueryFilter = {};
  
  build(): QueryFilter {
    return { ...this.query };
  }
  
  and(condition: any): FilterBuilder {
    if (this.query['$and']) {
      this.query['$and'].push(condition);
    } else {
      this.query['$and'] = [condition];
    }
    return this;
  }
  
  or(condition: any): FilterBuilder {
    if (this.query['$or']) {
      this.query['$or'].push(condition);
    } else {
      this.query['$or'] = [condition];
    }
    return this;
  }
  
  not(condition: any): FilterBuilder {
    this.query['$not'] = condition;
    return this;
  }
  
  exists(field: string, exists: boolean = true): FilterBuilder {
    this.query[field] = { $exists: exists };
    return this;
  }
  
  in(field: string, values: any[]): FilterBuilder {
    this.query[field] = { $in: values };
    return this;
  }
  
  nin(field: string, values: any[]): FilterBuilder {
    this.query[field] = { $nin: values };
    return this;
  }
  
  eq(field: string, value: any): FilterBuilder {
    this.query[field] = value;
    return this;
  }
  
  ne(field: string, value: any): FilterBuilder {
    this.query[field] = { $ne: value };
    return this;
  }
  
  gt(field: string, value: any): FilterBuilder {
    this.query[field] = { $gt: value };
    return this;
  }
  
  gte(field: string, value: any): FilterBuilder {
    this.query[field] = { $gte: value };
    return this;
  }
  
  lt(field: string, value: any): FilterBuilder {
    this.query[field] = { $lt: value };
    return this;
  }
  
  lte(field: string, value: any): FilterBuilder {
    this.query[field] = { $lte: value };
    return this;
  }
  
  regex(field: string, pattern: string, options: string = 'i'): FilterBuilder {
    this.query[field] = { $regex: pattern, $options: options };
    return this;
  }
  
  text(search: string, options: any = {}): FilterBuilder {
    this.query['$text'] = { $search: search, ...options };
    return this;
  }
  
  near(field: string, coordinates: [number, number], maxDistance?: number): FilterBuilder {
    this.query[field] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        ...(maxDistance && { $maxDistance: maxDistance })
      }
    };
    return this;
  }
  
  within(field: string, geometry: any): FilterBuilder {
    this.query[field] = {
      $geoWithin: {
        $geometry: geometry
      }
    };
    return this;
  }
}

/**
 * Create a new filter builder
 */
export function createFilterBuilder(): FilterBuilder {
  return new FilterBuilderImpl();
}

/**
 * Build search query
 */
export function buildSearchQuery(
  searchTerm: string,
  fields: string[],
  options: SearchOptions = {}
): QueryFilter {
  if (!searchTerm || !fields.length) {
    return {};
  }
  
  const searchQueries: any[] = [];
  
  for (const field of fields) {
    const regexOptions = options.caseSensitive ? '' : 'i';
    const pattern = options.wholeWord ? `\\b${searchTerm}\\b` : searchTerm;
    
    searchQueries.push({
      [field]: {
        $regex: pattern,
        $options: regexOptions
      }
    });
  }
  
  return searchQueries.length === 1 ? searchQueries[0] : { $or: searchQueries };
}

/**
 * Build geo query
 */
export function buildGeoQuery(field: string, geoQuery: GeoQuery): QueryFilter {
  const query: QueryFilter = {};
  
  switch (geoQuery.type) {
    case 'point':
      query[field] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: geoQuery.coordinates as [number, number]
          },
          ...(geoQuery.maxDistance && { $maxDistance: geoQuery.maxDistance }),
          ...(geoQuery.minDistance && { $minDistance: geoQuery.minDistance })
        }
      };
      break;
      
    case 'polygon':
      query[field] = {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: geoQuery.coordinates as unknown as number[][][]
          }
        }
      };
      break;
      
    case 'lineString':
      query[field] = {
        $geoIntersects: {
          $geometry: {
            type: 'LineString',
            coordinates: geoQuery.coordinates as number[][]
          }
        }
      };
      break;
  }
  
  return query;
}

/**
 * Build populate options
 */
export function buildPopulateOptions(
  paths: string | string[] | PopulateOptions | PopulateOptions[]
): PopulateOptions[] {
  if (typeof paths === 'string') {
    return [{ path: paths }];
  }
  
  if (Array.isArray(paths)) {
    if (paths.length === 0) {
      return [];
    }
    
    // Check if first element is a string
    if (typeof paths[0] === 'string') {
      return paths.map(path => ({ path: path as string }));
    }
    
    // Assume it's already PopulateOptions[]
    return paths as PopulateOptions[];
  }
  
  // Single PopulateOptions object
  return [paths as PopulateOptions];
}

/**
 * Build aggregation pipeline
 */
export function buildAggregationPipeline(
  match?: QueryFilter,
  sort?: SortOptions,
  limit?: number,
  skip?: number,
  project?: Record<string, 0 | 1>,
  group?: any,
  lookup?: any[]
): any[] {
  const pipeline: any[] = [];
  
  if (match && Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }
  
  if (lookup && lookup.length > 0) {
    pipeline.push(...lookup);
  }
  
  if (group) {
    pipeline.push({ $group: group });
  }
  
  if (sort) {
    pipeline.push({ $sort: buildMongoSort(sort) });
  }
  
  if (skip && skip > 0) {
    pipeline.push({ $skip: skip });
  }
  
  if (limit && limit > 0) {
    pipeline.push({ $limit: limit });
  }
  
  if (project && Object.keys(project).length > 0) {
    pipeline.push({ $project: project });
  }
  
  return pipeline;
}

/**
 * Build facet aggregation
 */
export function buildFacetAggregation(facets: Record<string, any[]>): any {
  return {
    $facet: facets
  };
}

/**
 * Build group aggregation
 */
export function buildGroupAggregation(
  groupBy: any,
  accumulators: Record<string, any> = {}
): any {
  return {
    $group: {
      _id: groupBy,
      ...accumulators
    }
  };
}

/**
 * Build lookup aggregation
 */
export function buildLookupAggregation(
  from: string,
  localField: string,
  foreignField: string,
  as: string,
  pipeline?: any[]
): any {
  const lookup: any = {
    from,
    localField,
    foreignField,
    as
  };
  
  if (pipeline && pipeline.length > 0) {
    lookup.pipeline = pipeline;
  }
  
  return { $lookup: lookup };
}

/**
 * Build unwind aggregation
 */
export function buildUnwindAggregation(
  path: string,
  options: {
    preserveNullAndEmptyArrays?: boolean;
    includeArrayIndex?: string;
  } = {}
): any {
  return {
    $unwind: {
      path,
      ...options
    }
  };
}

/**
 * Build addFields aggregation
 */
export function buildAddFieldsAggregation(fields: Record<string, any>): any {
  return {
    $addFields: fields
  };
}

/**
 * Build replaceRoot aggregation
 */
export function buildReplaceRootAggregation(newRoot: string | any): any {
  return {
    $replaceRoot: {
      newRoot: typeof newRoot === 'string' ? `$${newRoot}` : newRoot
    }
  };
}

/**
 * Query optimization helpers
 */
export class QueryOptimizer {
  /**
   * Analyze query for optimization opportunities
   */
  static analyzeQuery(query: QueryFilter): {
    hints: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const hints: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check for $or queries
    if (query['$or'] && Array.isArray(query['$or'])) {
      warnings.push('$or queries can be slow - consider adding compound indexes');
      recommendations.push('Create compound indexes for $or conditions');
    }
    
    // Check for regex without anchors
    for (const [field, value] of Object.entries(query)) {
      if (typeof value === 'object' && value.$regex && !value.$regex.startsWith('^')) {
        warnings.push(`Regex query on field '${field}' without anchors can be slow`);
        recommendations.push(`Add anchors (^$) to regex pattern for field '${field}'`);
      }
    }
    
    // Check for range queries
    const rangeFields = [FIELD_NAMES.CREATED_AT, FIELD_NAMES.UPDATED_AT, 'date', 'timestamp'];
    const hasRangeQuery = Object.keys(query).some(key => 
      rangeFields.includes(key) && 
      (query[key].$gte || query[key].$lte || query[key].$gt || query[key].$lt)
    );
    
    if (hasRangeQuery) {
      hints.push('Consider adding indexes on date/time fields for range queries');
    }
    
    // Check for text search
    if (query['$text']) {
      hints.push('Ensure text index exists for $text queries');
    }
    
    return { hints, warnings, recommendations };
  }
  
  /**
   * Optimize query by adding hints
   */
  static optimizeQuery(query: QueryFilter): QueryFilter {
    const optimized = { ...query };
    
    // Add query hints based on analysis
    const analysis = this.analyzeQuery(query);
    
    if (analysis.hints.length > 0) {
      // In a real implementation, you might add $hint or other optimizations
      log.debug('Query optimization hints', { hints: analysis.hints });
    }
    
    return optimized;
  }
}

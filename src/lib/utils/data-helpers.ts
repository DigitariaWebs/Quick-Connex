/**
 * Data Helpers
 * 
 * Array and object manipulation utilities.
 * Provides comprehensive data processing and transformation functions.
 */

// ===== TYPES =====

export interface GroupByResult<T> {
  [key: string]: T[];
}

export interface SortOptions {
  key: string | ((item: any) => any);
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  key?: string | ((item: any) => any);
  value?: any;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
}

export interface ChunkOptions {
  size: number;
  preserveEmpty?: boolean;
}

// ===== ARRAY OPERATIONS =====

/**
 * Group array by key or function
 */
export function groupBy<T>(
  array: T[],
  key: string | ((item: T) => any)
): GroupByResult<T> {
  const result: GroupByResult<T> = {};
  
  array.forEach(item => {
    const groupKey = typeof key === 'function' ? key(item) : item[key as keyof T];
    const groupKeyStr = String(groupKey);
    
    if (!result[groupKeyStr]) {
      result[groupKeyStr] = [];
    }
    
    result[groupKeyStr].push(item);
  });
  
  return result;
}

/**
 * Sort array by key or function
 */
export function sortBy<T>(
  array: T[],
  key: string | ((item: T) => any),
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aValue = typeof key === 'function' ? key(a) : a[key as keyof T];
    const bValue = typeof key === 'function' ? key(b) : b[key as keyof T];
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter array by key and value
 */
export function filterBy<T>(
  array: T[],
  predicate: ((item: T) => boolean) | FilterOptions
): T[] {
  if (typeof predicate === 'function') {
    return array.filter(predicate);
  }
  
  const { key, value, operator = 'eq' } = predicate;
  
  return array.filter(item => {
    const itemValue = typeof key === 'function' ? key(item) : item[key as keyof T];
    
    switch (operator) {
      case 'eq':
        return itemValue === value;
      case 'ne':
        return itemValue !== value;
      case 'gt':
        return itemValue > value;
      case 'gte':
        return itemValue >= value;
      case 'lt':
        return itemValue < value;
      case 'lte':
        return itemValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(itemValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(itemValue);
      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      case 'regex':
        return new RegExp(value).test(String(itemValue));
      default:
        return itemValue === value;
    }
  });
}

/**
 * Get unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Get unique values by key
 */
export function uniqueBy<T>(
  array: T[],
  key: string | ((item: T) => any)
): T[] {
  const seen = new Set();
  return array.filter(item => {
    const keyValue = typeof key === 'function' ? key(item) : item[key as keyof T];
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}

/**
 * Split array into chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested arrays
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, item) => {
    return acc.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}

/**
 * Remove falsy values from array
 */
export function compact<T>(array: T[]): NonNullable<T>[] {
  return array.filter((item): item is NonNullable<T> => Boolean(item));
}

/**
 * Get intersection of two arrays
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => set2.has(item));
}

/**
 * Get difference between two arrays
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => !set2.has(item));
}

/**
 * Get union of two arrays
 */
export function union<T>(array1: T[], array2: T[]): T[] {
  return unique([...array1, ...array2]);
}

// ===== OBJECT OPERATIONS =====

/**
 * Pick specific fields from object
 */
export function pickFields<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  fields.forEach(field => {
    if (field in obj) {
      result[field] = obj[field];
    }
  });
  return result;
}

/**
 * Omit specific fields from object
 */
export function omitFields<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  fields: K[]
): Omit<T, K> {
  const result = { ...obj };
  fields.forEach(field => {
    delete result[field];
  });
  return result;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Flatten nested object
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  separator: string = '.'
): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      const value = obj[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey, separator));
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

/**
 * Unflatten object
 */
export function unflattenObject(
  obj: Record<string, any>,
  separator: string = '.'
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const keys = key.split(separator);
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }
      
      current[keys[keys.length - 1]] = obj[key];
    }
  }
  
  return result;
}

// ===== VALUE CHECKING =====

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is not empty
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is not null or undefined
 */
export function isNotNullish(value: any): boolean {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.constructor === Object
  );
}

/**
 * Check if value is an array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Check if value is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

// ===== ARRAY UTILITIES =====

/**
 * Get first element of array
 */
export function first<T>(array: T[]): T | undefined {
  return array[0];
}

/**
 * Get last element of array
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

/**
 * Get random element from array
 */
export function random<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sample random elements from array
 */
export function sample<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
}

/**
 * Get array without first element
 */
export function tail<T>(array: T[]): T[] {
  return array.slice(1);
}

/**
 * Get array without last element
 */
export function head<T>(array: T[]): T[] {
  return array.slice(0, -1);
}

/**
 * Get array with first n elements
 */
export function take<T>(array: T[], count: number): T[] {
  return array.slice(0, count);
}

/**
 * Get array without first n elements
 */
export function drop<T>(array: T[], count: number): T[] {
  return array.slice(count);
}

// ===== OBJECT UTILITIES =====

/**
 * Get nested property value
 */
export function getNestedProperty(
  obj: Record<string, any>,
  path: string,
  defaultValue?: any
): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Set nested property value
 */
export function setNestedProperty(
  obj: Record<string, any>,
  path: string,
  value: any
): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Remove nested property
 */
export function removeNestedProperty(
  obj: Record<string, any>,
  path: string
): boolean {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || !isPlainObject(current[key])) {
      return false;
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }
  
  return false;
}

/**
 * Check if nested property exists
 */
export function hasNestedProperty(
  obj: Record<string, any>,
  path: string
): boolean {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || !isPlainObject(current[key])) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

// ===== TRANSFORMATION UTILITIES =====

/**
 * Transform array values
 */
export function mapValues<T, U>(
  obj: Record<string, T>,
  transform: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = transform(obj[key], key);
    }
  }
  return result;
}

/**
 * Filter object properties
 */
export function filterObject<T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Invert object keys and values
 */
export function invertObject<T extends string | number>(
  obj: Record<string, T>
): Record<T, string> {
  const result: Record<T, string> = {} as Record<T, string>;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[obj[key]] = key;
    }
  }
  return result;
}

/**
 * Get object keys
 */
export function getKeys<T extends Record<string, any>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Get object values
 */
export function getValues<T extends Record<string, any>>(obj: T): T[keyof T][] {
  return Object.values(obj);
}

/**
 * Get object entries
 */
export function getEntries<T extends Record<string, any>>(
  obj: T
): [keyof T, T[keyof T]][];
export function getEntries<T>(obj: Record<string, T>): [string, T][] {
  return Object.entries(obj);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create object from array
 */
export function fromPairs<T>(pairs: [string, T][]): Record<string, T> {
  const result: Record<string, T> = {};
  pairs.forEach(([key, value]) => {
    result[key] = value;
  });
  return result;
}

/**
 * Convert object to array of pairs
 */
export function toPairs<T>(obj: Record<string, T>): [string, T][] {
  return Object.entries(obj);
}

/**
 * Remove null and undefined values
 */
export function removeNullValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Get size of collection
 */
export function size(collection: any[] | Record<string, any>): number {
  if (Array.isArray(collection)) {
    return collection.length;
  }
  if (typeof collection === 'object' && collection !== null) {
    return Object.keys(collection).length;
  }
  return 0;
}

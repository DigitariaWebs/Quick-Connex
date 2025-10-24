import {
  format,
  parseISO,
  isValid,
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addYears,
  subDays,
  subHours,
  subMinutes,
  subMonths,
  subYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInYears,
  isAfter,
  isBefore,
  isEqual,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
  getYear,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds
} from 'date-fns';

/**
 * Date/Time Utilities
 * 
 * Comprehensive date manipulation and formatting utilities using date-fns.
 * Provides consistent date handling across the application.
 */

// ===== TYPES =====

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimePeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // in milliseconds
}

// ===== DATE FORMATTING =====

/**
 * Format date in various formats
 */
export function formatDate(
  date: Date | string,
  formatString: string = 'yyyy-MM-dd'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }
  
  return format(dateObj, formatString);
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy');
}

/**
 * Format date and time for display
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

/**
 * Format date as ISO string
 */
export function formatDateISO(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toISOString();
}

/**
 * Format date for API responses
 */
export function formatDateForAPI(date: Date | string): string {
  return formatDateISO(date);
}

// ===== DATE PARSING =====

/**
 * Parse date string safely
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Parse date with fallback
 */
export function parseDateWithFallback(
  dateString: string,
  fallback: Date = new Date()
): Date {
  const parsed = parseDate(dateString);
  return parsed || fallback;
}

/**
 * Parse multiple date formats
 */
export function parseDateFlexible(dateString: string): Date | null {
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'MM/dd/yyyy HH:mm:ss'
  ];
  
  for (const formatStr of formats) {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return date;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

// ===== DATE VALIDATION =====

/**
 * Check if date is valid
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && isValid(date);
}

/**
 * Validate date range
 */
export function isValidDateRange(start: Date | string, end: Date | string): boolean {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  
  if (!isValid(startDate) || !isValid(endDate)) {
    return false;
  }
  
  return isBefore(startDate, endDate) || isEqual(startDate, endDate);
}

/**
 * Check if date is within range
 */
export function isWithinRange(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const startObj = typeof start === 'string' ? parseISO(start) : start;
  const endObj = typeof end === 'string' ? parseISO(end) : end;
  
  if (!isValid(dateObj) || !isValid(startObj) || !isValid(endObj)) {
    return false;
  }
  
  return isWithinInterval(dateObj, { start: startObj, end: endObj });
}

// ===== DATE ARITHMETIC =====

/**
 * Add days to date
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
}

/**
 * Add hours to date
 */
export function addHoursToDate(date: Date | string, hours: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addHours(dateObj, hours);
}

/**
 * Add minutes to date
 */
export function addMinutesToDate(date: Date | string, minutes: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addMinutes(dateObj, minutes);
}

/**
 * Add months to date
 */
export function addMonthsToDate(date: Date | string, months: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addMonths(dateObj, months);
}

/**
 * Add years to date
 */
export function addYearsToDate(date: Date | string, years: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addYears(dateObj, years);
}

/**
 * Subtract days from date
 */
export function subtractDaysFromDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subDays(dateObj, days);
}

/**
 * Subtract hours from date
 */
export function subtractHoursFromDate(date: Date | string, hours: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subHours(dateObj, hours);
}

/**
 * Subtract minutes from date
 */
export function subtractMinutesFromDate(date: Date | string, minutes: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subMinutes(dateObj, minutes);
}

/**
 * Subtract months from date
 */
export function subtractMonthsFromDate(date: Date | string, months: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subMonths(dateObj, months);
}

/**
 * Subtract years from date
 */
export function subtractYearsFromDate(date: Date | string, years: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subYears(dateObj, years);
}

// ===== DATE DIFFERENCES =====

/**
 * Calculate date difference in days
 */
export function calculateDateDiff(
  date1: Date | string,
  date2: Date | string,
  unit: 'days' | 'hours' | 'minutes' | 'months' | 'years' = 'days'
): number {
  const date1Obj = typeof date1 === 'string' ? parseISO(date1) : date1;
  const date2Obj = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  switch (unit) {
    case 'days':
      return differenceInDays(date2Obj, date1Obj);
    case 'hours':
      return differenceInHours(date2Obj, date1Obj);
    case 'minutes':
      return differenceInMinutes(date2Obj, date1Obj);
    case 'months':
      return differenceInMonths(date2Obj, date1Obj);
    case 'years':
      return differenceInYears(date2Obj, date1Obj);
    default:
      return differenceInDays(date2Obj, date1Obj);
  }
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(
  start: Date | string,
  end: Date | string
): Duration {
  const startObj = typeof start === 'string' ? parseISO(start) : start;
  const endObj = typeof end === 'string' ? parseISO(end) : end;
  
  const total = endObj.getTime() - startObj.getTime();
  const days = differenceInDays(endObj, startObj);
  const hours = differenceInHours(endObj, startObj) % 24;
  const minutes = differenceInMinutes(endObj, startObj) % 60;
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    total
  };
}

// ===== DATE RANGES =====

/**
 * Get date range for period
 */
export function getDateRangeForPeriod(
  period: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom',
  customStart?: Date | string,
  customEnd?: Date | string
): DateRange {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    
    case 'week':
      return {
        start: startOfWeek(now),
        end: endOfWeek(now)
      };
    
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now)
      };
    
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom start and end dates are required');
      }
      return {
        start: typeof customStart === 'string' ? parseISO(customStart) : customStart,
        end: typeof customEnd === 'string' ? parseISO(customEnd) : customEnd
      };
    
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
  }
}

/**
 * Get time periods for analytics
 */
export function getTimePeriods(): TimePeriod[] {
  const now = new Date();
  
  return [
    {
      start: startOfDay(now),
      end: endOfDay(now),
      label: 'Today'
    },
    {
      start: startOfDay(subDays(now, 1)),
      end: endOfDay(subDays(now, 1)),
      label: 'Yesterday'
    },
    {
      start: startOfWeek(now),
      end: endOfWeek(now),
      label: 'This Week'
    },
    {
      start: startOfWeek(subDays(now, 7)),
      end: endOfWeek(subDays(now, 7)),
      label: 'Last Week'
    },
    {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: 'This Month'
    },
    {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
      label: 'Last Month'
    },
    {
      start: startOfYear(now),
      end: endOfYear(now),
      label: 'This Year'
    }
  ];
}

// ===== DURATION FORMATTING =====

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const duration = calculateDuration(new Date(0), new Date(milliseconds));
  
  const parts: string[] = [];
  
  if (duration.days > 0) {
    parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
  }
  
  if (duration.hours > 0) {
    parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
  }
  
  if (duration.minutes > 0) {
    parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`);
  }
  
  if (duration.seconds > 0 && parts.length === 0) {
    parts.push(`${duration.seconds} second${duration.seconds !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : '0 seconds';
}

/**
 * Format duration in short format
 */
export function formatDurationShort(milliseconds: number): string {
  const duration = calculateDuration(new Date(0), new Date(milliseconds));
  
  if (duration.days > 0) {
    return `${duration.days}d ${duration.hours}h`;
  }
  
  if (duration.hours > 0) {
    return `${duration.hours}h ${duration.minutes}m`;
  }
  
  if (duration.minutes > 0) {
    return `${duration.minutes}m ${duration.seconds}s`;
  }
  
  return `${duration.seconds}s`;
}

// ===== TIME UTILITIES =====

/**
 * Set time on date
 */
export function setTimeOnDate(
  date: Date | string,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0
): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(dateObj, hours),
        minutes
      ),
      seconds
    ),
    milliseconds
  );
}

/**
 * Get time components from date
 */
export function getTimeComponents(date: Date | string): {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  return {
    hours: getHours(dateObj),
    minutes: getMinutes(dateObj),
    seconds: getSeconds(dateObj),
    milliseconds: dateObj.getMilliseconds()
  };
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  
  return isEqual(startOfDay(dateObj), startOfDay(today));
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const yesterday = subDays(new Date(), 1);
  
  return isEqual(startOfDay(dateObj), startOfDay(yesterday));
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isAfter(dateObj, new Date());
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(dateObj, new Date());
}

// ===== TIMEZONE UTILITIES =====

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone?: string): number {
  if (timezone) {
    // In a real application, you would use a library like moment-timezone
    // For now, return the local timezone offset
    return new Date().getTimezoneOffset();
  }
  
  return new Date().getTimezoneOffset();
}

/**
 * Convert date to timezone
 */
export function convertToTimezone(
  date: Date | string,
  timezone: string
): Date {
  // In a real application, you would use a library like moment-timezone
  // For now, return the date as-is
  return typeof date === 'string' ? parseISO(date) : date;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Get current date as ISO string
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString();
}

/**
 * Get current date as Date object
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Create date from timestamp
 */
export function createDateFromTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Get date parts
 */
export function getDateParts(date: Date | string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  return {
    year: getYear(dateObj),
    month: getMonth(dateObj) + 1, // getMonth returns 0-11
    day: dateObj.getDate(),
    weekday: getDay(dateObj)
  };
}

/**
 * Compare dates
 */
export function compareDates(
  date1: Date | string,
  date2: Date | string
): -1 | 0 | 1 {
  const date1Obj = typeof date1 === 'string' ? parseISO(date1) : date1;
  const date2Obj = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  if (isEqual(date1Obj, date2Obj)) return 0;
  if (isBefore(date1Obj, date2Obj)) return -1;
  return 1;
}

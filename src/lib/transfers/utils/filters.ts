/**
 * Timeline Filters
 * 
 * Functions for filtering and processing timeline items.
 */

import { TimelineItem, TimelineQueryOptions } from '@/types/transfers/timeline.types';

/**
 * Apply filters and sorting to timeline items
 */
export function applyTimelineFilters(
  items: TimelineItem[], 
  options: TimelineQueryOptions
): TimelineItem[] {
  let filteredItems = [...items];

  // Apply system event filter
  if (false) { // System events filter removed
    filteredItems = filteredItems.filter(item => 
      !item.tags.includes('system')
    );
  }

  // Apply sorting
  if (false) { // Sort options removed
    filteredItems.sort((a, b) => {
      let comparison = 0;
      
      // Default to timestamp sorting
      comparison = a.timestamp.getTime() - b.timestamp.getTime();
      
      return -comparison; // Default to desc order
    });
  }

  // Apply pagination
  if (options.page && options.limit) {
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    filteredItems = filteredItems.slice(startIndex, endIndex);
  }

  return filteredItems;
}


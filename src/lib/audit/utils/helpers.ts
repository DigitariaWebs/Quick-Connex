/**
 * Helper Utilities
 * 
 * General helper functions for audit logging.
 */

/**
 * Calculate audit duration
 */
export function calculateAuditDuration(startTime: number, endTime?: number): number {
  const end = endTime || Date.now();
  return end - startTime;
}

/**
 * Generate audit ID
 */
export function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit_${timestamp}_${random}`;
}


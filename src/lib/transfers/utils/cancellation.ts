/**
 * Transfer Cancellation Utilities
 *
 * This file contains utility functions for handling the 4-hour cancellation window
 * for transfers that have been accepted by employees.
 */

import { ITransfer } from "@/models/Transfer";

// Interface for transfer objects that might come from different sources
interface TransferLike {
  status: string;
  acceptedAt?: Date | string;
}

// 4 hours in milliseconds
export const CANCELLATION_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Check if a transfer can still be cancelled within the 4-hour window
 */
export function canCancelTransfer(transfer: ITransfer | TransferLike): boolean {
  // Only in_progress transfers can be cancelled
  if (transfer.status !== "in_progress") {
    return false;
  }

  // Must have an acceptedAt timestamp
  if (!transfer.acceptedAt) {
    return false;
  }

  // Check if we're still within the 4-hour window
  const now = new Date();
  const acceptedAtDate = new Date(transfer.acceptedAt);

  // Check if the date is valid
  if (isNaN(acceptedAtDate.getTime())) {
    return false;
  }

  const timeSinceAccepted = now.getTime() - acceptedAtDate.getTime();

  return timeSinceAccepted <= CANCELLATION_WINDOW_MS;
}

/**
 * Get the remaining time in the cancellation window
 */
export function getRemainingCancellationTime(
  transfer: ITransfer | TransferLike,
): number {
  if (!transfer.acceptedAt) {
    return 0;
  }

  const now = new Date();
  const acceptedAtDate = new Date(transfer.acceptedAt);

  // Check if the date is valid
  if (isNaN(acceptedAtDate.getTime())) {
    return 0;
  }

  const timeSinceAccepted = now.getTime() - acceptedAtDate.getTime();
  const remainingTime = CANCELLATION_WINDOW_MS - timeSinceAccepted;

  return Math.max(0, remainingTime);
}

/**
 * Get a human-readable string of the remaining cancellation time
 */
export function getRemainingCancellationTimeString(
  transfer: ITransfer | TransferLike,
): string {
  const remainingMs = getRemainingCancellationTime(transfer);

  if (remainingMs <= 0) {
    return "Cancellation window expired";
  }

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

/**
 * Check if the cancellation window is about to expire (within 30 minutes)
 */
export function isCancellationWindowExpiring(
  transfer: ITransfer | TransferLike,
): boolean {
  const remainingMs = getRemainingCancellationTime(transfer);
  const thirtyMinutes = 30 * 60 * 1000;

  return remainingMs > 0 && remainingMs <= thirtyMinutes;
}

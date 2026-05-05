/**
 * Check-in module constants
 */

/**
 * QR code expiration window in milliseconds (45 seconds)
 */
export const QR_EXPIRE_WINDOW = 45000;

/**
 * QR code tolerance - number of windows to accept (current + previous)
 * This allows for time drift and user delay
 */
export const QR_TOLERANCE = 1;

/**
 * Check-in status enum for logging
 */
export enum CheckInLogStatus {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

/**
 * Check-in error reasons for logging
 */
export enum CheckInFailReason {
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  DUPLICATE_CHECKIN = 'DUPLICATE_CHECKIN',
  INVALID_QR = 'INVALID_QR',
  NOT_REGISTERED = 'NOT_REGISTERED',
}

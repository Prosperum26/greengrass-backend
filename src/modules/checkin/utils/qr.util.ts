import { createHash } from 'crypto';
import { QR_EXPIRE_WINDOW, QR_TOLERANCE } from '../constants/checkin.constants';

/**
 * Utility class for QR code token generation and verification
 * Uses SHA256 hashing with time-based rotation
 */
export class QrUtil {
  /**
   * Generate a QR token for an event
   * Token is based on eventId + secret + current time window
   *
   * @param eventId - The event ID
   * @param secret - The QR secret from environment variable
   * @returns The generated QR token (SHA256 hash)
   */
  static generateQrToken(eventId: string, secret: string): string {
    const timeWindow = this.getCurrentTimeWindow();
    const data = `${eventId}:${secret}:${timeWindow}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify a QR token for an event
   * Accepts current window and previous window for tolerance
   *
   * @param eventId - The event ID
   * @param token - The token to verify
   * @param secret - The QR secret from environment variable
   * @returns True if token is valid, false otherwise
   */
  static verifyQrToken(
    eventId: string,
    token: string,
    secret: string,
  ): boolean {
    const currentWindow = this.getCurrentTimeWindow();

    // Check current window
    const currentData = `${eventId}:${secret}:${currentWindow}`;
    const currentHash = createHash('sha256').update(currentData).digest('hex');

    if (token === currentHash) {
      return true;
    }

    // Check previous window (for tolerance)
    if (QR_TOLERANCE > 0) {
      const previousWindow = currentWindow - 1;
      const previousData = `${eventId}:${secret}:${previousWindow}`;
      const previousHash = createHash('sha256')
        .update(previousData)
        .digest('hex');

      if (token === previousHash) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the current time window based on QR_EXPIRE_WINDOW
   * Each window is a time slice of QR_EXPIRE_WINDOW milliseconds
   *
   * @returns The current time window number
   */
  private static getCurrentTimeWindow(): number {
    return Math.floor(Date.now() / QR_EXPIRE_WINDOW);
  }
}

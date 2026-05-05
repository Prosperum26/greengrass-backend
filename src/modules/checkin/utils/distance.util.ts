/**
 * Utility functions for calculating distances between GPS coordinates
 * Uses the Haversine formula for accurate distance calculation
 */

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a user is within the allowed radius of an event location
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param eventLat Event's latitude
 * @param eventLon Event's longitude
 * @param allowedRadius Allowed radius in meters
 * @returns Object with isWithinRange boolean and actual distance
 */
export function isWithinRange(
  userLat: number,
  userLon: number,
  eventLat: number,
  eventLon: number,
  allowedRadius: number,
): { isWithinRange: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLon, eventLat, eventLon);

  return {
    isWithinRange: distance <= allowedRadius,
    distance,
  };
}

/**
 * Validate GPS coordinates
 * @param latitude Latitude to validate
 * @param longitude Longitude to validate
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}

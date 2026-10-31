/**
 * Geolocation and Coordinate Utilities for Rescue Operations
 */

export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  // 0,0 is Null Island - coordinates were missing or defaulted
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

export function formatCoordinates(lat?: number | null, lng?: number | null, precision = 6): string {
  if (!isValidCoordinate(lat, lng)) return 'Exact location unavailable';
  return `${lat!.toFixed(precision)}, ${lng!.toFixed(precision)}`;
}

export function copyCoordinatesToClipboard(lat: number, lng: number): Promise<boolean> {
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    // Fallback for non-https or older webviews
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve(true);
    } catch (err) {
      document.body.removeChild(textArea);
      return Promise.resolve(false);
    }
  }
}

export function buildTurnByTurnUrl(
  destLat: number,
  destLng: number,
  origin?: { lat: number; lng: number } | string | null
): string {
  const destStr = `${destLat.toFixed(6)},${destLng.toFixed(6)}`;
  if (!origin) {
    // Google Maps will automatically use the user's current GPS location if origin is omitted
    return `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;
  }
  if (typeof origin === 'string' && origin.trim()) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.trim())}&destination=${destStr}&travelmode=driving`;
  }
  if (typeof origin === 'object' && origin.lat !== undefined && origin.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}&destination=${destStr}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;
}

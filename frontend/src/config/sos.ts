/**
 * Emergency SOS Configuration for ARES Damage Mapper
 *
 * Configurable emergency recipient phone number.
 * Use the placeholder 'SOS_PHONE_NUMBER' as required by specification.
 *
 * To customize for your region:
 * Set VITE_SOS_PHONE_NUMBER in frontend/.env (e.g. VITE_SOS_PHONE_NUMBER=112 or your local emergency dispatch number)
 * or update the fallback below.
 */
export const SOS_PHONE_NUMBER: string =
  (import.meta.env.VITE_SOS_PHONE_NUMBER as string) || "SOS_PHONE_NUMBER";

/**
 * Builds the cross-platform SMS URI according to Android and iOS conventions.
 * iOS uses `sms:NUMBER&body=...`
 * Android & standards use `sms:NUMBER?body=...`
 */
export function buildEmergencySmsUri(phoneNumber: string, messageBody: string): string {
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const separator = isIOS ? "&" : "?";
  const cleanNumber = phoneNumber.trim();
  const encodedBody = encodeURIComponent(messageBody);

  return `sms:${cleanNumber}${separator}body=${encodedBody}`;
}

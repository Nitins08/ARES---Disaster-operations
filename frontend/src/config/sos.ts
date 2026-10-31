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
export const SOS_PHONE_NUMBERS: string[] = ["9940610958", "7871179254"];

export const SOS_PHONE_NUMBER: string =
  (import.meta.env.VITE_SOS_PHONE_NUMBER as string) || SOS_PHONE_NUMBERS.join(",");

/**
 * Builds the cross-platform SMS URI according to Android and iOS conventions.
 * iOS uses `sms:NUMBER&body=...`
 * Android & standards use `sms:NUMBER?body=...`
 * Multiple recipients are comma-separated.
 */
export function buildEmergencySmsUri(phoneNumber: string, messageBody: string): string {
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const separator = isIOS ? "&" : "?";
  // Clean all spaces and join with comma
  const cleanNumbers = phoneNumber
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .join(",");
  const encodedBody = encodeURIComponent(messageBody);

  return `sms:${cleanNumbers}${separator}body=${encodedBody}`;
}

/**
 * Phone Number Normalizer
 *
 * Normalizes various phone number formats to E.164 format for consistent grouping.
 * Examples:
 *   +14084255283 → +14084255283 (already E.164)
 *   14084255283  → +14084255283 (11 digits, US)
 *   4084255283   → +14084255283 (10 digits, US)
 *   5599605932   → +15599605932 (10 digits, US)
 */

/**
 * Removes all non-digit characters from a phone number
 */
export function stripNonDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normalizes a phone number to E.164 format
 * Assumes US/Canada numbers (+1 country code) for numbers without country code
 *
 * @param phone - The phone number in any format
 * @returns Normalized phone number in E.164 format, or original if can't normalize
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '';
  }

  // Trim whitespace
  const trimmed = phone.trim();

  // Check if already in E.164 format
  if (/^\+1\d{10}$/.test(trimmed)) {
    return trimmed;
  }

  // Strip all non-digit characters
  const digits = stripNonDigits(trimmed);

  // Handle different digit lengths
  if (digits.length === 10) {
    // 10 digits: local US number, add +1
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: US number with country code, add +
    return `+${digits}`;
  } else if (digits.length === 12 && digits.startsWith('01')) {
    // 12 digits starting with 01: International format without +
    return `+${digits.substring(1)}`;
  } else if (digits.length > 10 && digits.length <= 15) {
    // International number, just add + if not present
    if (trimmed.startsWith('+')) {
      return trimmed.replace(/[^\d+]/g, '');
    }
    return `+${digits}`;
  } else if (digits.length < 10 && digits.length > 0) {
    // Short code or partial number - return as-is with + prefix
    return `+${digits}`;
  }

  // Can't normalize - return original with + prefix if it has digits
  if (digits.length > 0) {
    return `+${digits}`;
  }

  return trimmed;
}

/**
 * Formats a phone number for display
 * E.164: +14084255283 → (408) 425-5283
 *
 * @param phone - Phone number (preferably normalized)
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = stripNonDigits(phone);

  // US/Canada format (10 or 11 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  // Return original for other formats
  return phone;
}

/**
 * Extracts the area code from a normalized phone number
 *
 * @param normalizedPhone - Phone number in E.164 format
 * @returns Area code or empty string
 */
export function extractAreaCode(normalizedPhone: string): string {
  const digits = stripNonDigits(normalizedPhone);

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1, 4);
  } else if (digits.length === 10) {
    return digits.slice(0, 3);
  }

  return '';
}

/**
 * Checks if two phone numbers are the same (after normalization)
 *
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if they represent the same number
 */
export function isSamePhoneNumber(phone1: string, phone2: string): boolean {
  return normalizePhoneNumber(phone1) === normalizePhoneNumber(phone2);
}

/**
 * Creates a key for grouping conversations by normalized phone
 *
 * @param phone - Phone number in any format
 * @returns Normalized phone number suitable for use as a grouping key
 */
export function getConversationKey(phone: string): string {
  return normalizePhoneNumber(phone);
}

export function onlyDigits(str) {
  return String(str || '').replace(/\D/g, '');
}

// All DDDs (area codes) actually assigned by Anatel in Brazil.
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44,
  45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81,
  82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

function hasObviouslyFakeBody(digits) {
  // All digits identical (e.g. 00000000000, 99999999999)
  if (new Set(digits).size === 1) return true;

  // Body after DDD all identical (e.g. DDD + 999999999)
  const body = digits.slice(2);
  if (new Set(body).size === 1) return true;

  // Common ascending/descending sequences people type to bypass forms
  const sequences = ['0123456789', '1234567890', '9876543210', '0987654321', '123456789', '987654321'];
  if (sequences.some((seq) => digits.includes(seq))) return true;

  return false;
}

/**
 * Validates a Brazilian phone number: real DDD, correct digit count for
 * landline (8 digits) or mobile (9 digits starting with 9), and rejects
 * obviously fake patterns (repeated digits, sequential digits).
 */
export function isValidPhone(rawPhone) {
  const digits = onlyDigits(rawPhone);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return false;

  if (digits.length === 11 && digits[2] !== '9') return false;

  if (hasObviouslyFakeBody(digits)) return false;

  return true;
}

/**
 * Canonical form used for uniqueness comparisons (digits only, with DDD).
 */
export function normalizePhone(rawPhone) {
  return onlyDigits(rawPhone);
}

export function maskPhone(rawPhone) {
  const digits = onlyDigits(rawPhone);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-****`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-****`;
  return rawPhone;
}

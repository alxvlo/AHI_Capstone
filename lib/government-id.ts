export const GOVERNMENT_ID_TYPES = [
  "Passport",
  "National ID",
  "Driver's License",
  "Other Government ID",
] as const;

const GOVERNMENT_ID_SEPARATOR = "::";

function normalizeIdType(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed.includes(GOVERNMENT_ID_SEPARATOR)) {
    return null;
  }

  return trimmed;
}

function normalizeIdNumber(value: string) {
  const trimmed = value.trim().replace(/\s+/g, "").toUpperCase();

  if (!trimmed || trimmed.includes(GOVERNMENT_ID_SEPARATOR)) {
    return null;
  }

  return trimmed;
}

/**
 * Validates that idNumber matches the expected format for idType.
 * Returns null if valid, or a user-facing error string if invalid.
 */
export function validateGovernmentIdFormat(
  idType: string,
  idNumber: string
): string | null {
  const normalized = idNumber.trim().replace(/\s+/g, "").toUpperCase();

  if (!normalized) return "ID number is required.";

  if (/[^A-Z0-9\-/]/.test(normalized)) {
    return "ID number contains invalid characters — only letters, digits, hyphens, and slashes are allowed.";
  }

  switch (idType) {
    case "Passport":
      if (!/^[A-Z]{1,2}\d{6,8}$/.test(normalized))
        return "Passport number should be 1–2 letters followed by 6–8 digits (e.g. P1234567).";
      break;
    case "National ID":
      if (normalized.replace(/-/g, "").length < 12 || !/^[\d\-]{12,18}$/.test(normalized))
        return "National ID should contain 12–16 digits, optionally separated by hyphens (e.g. 0000-0000-0000-0).";
      break;
    case "Driver's License":
      if (normalized.length < 6 || normalized.length > 20)
        return "Driver's License number should be 6–20 characters.";
      break;
    default:
      if (normalized.length < 3 || normalized.length > 24)
        return "Government ID number should be 3–24 alphanumeric characters.";
  }

  return null;
}

export function buildGovernmentIdForStorage(idType: string, idNumber: string) {
  const normalizedType = normalizeIdType(idType);
  const normalizedNumber = normalizeIdNumber(idNumber);

  if (!normalizedType || !normalizedNumber) {
    return null;
  }

  return `${normalizedType}${GOVERNMENT_ID_SEPARATOR}${normalizedNumber}`;
}

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

export function buildGovernmentIdForStorage(idType: string, idNumber: string) {
  const normalizedType = normalizeIdType(idType);
  const normalizedNumber = normalizeIdNumber(idNumber);

  if (!normalizedType || !normalizedNumber) {
    return null;
  }

  return `${normalizedType}${GOVERNMENT_ID_SEPARATOR}${normalizedNumber}`;
}

const PH_COUNTRY_CODE = "63";
const PH_MOBILE_DIGITS = 10;
const PH_MOBILE_PREFIX = "9";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function extractPhilippineMobileDigits(value: string) {
  let digits = digitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith(PH_COUNTRY_CODE)) {
    digits = digits.slice(PH_COUNTRY_CODE.length);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, PH_MOBILE_DIGITS);
}

export function formatPhilippineMobileInput(value: string) {
  const digits = extractPhilippineMobileDigits(value);

  if (!digits) {
    return "";
  }

  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, PH_MOBILE_DIGITS);

  return ["+63", first, second, third].filter(Boolean).join(" ");
}

export function isValidPhilippineMobile(value: string) {
  const digits = extractPhilippineMobileDigits(value);

  return digits.length === PH_MOBILE_DIGITS && digits.startsWith(PH_MOBILE_PREFIX);
}

export function normalizePhilippineMobileForStorage(value: string) {
  const digits = extractPhilippineMobileDigits(value);

  if (!digits) {
    return null;
  }

  if (!isValidPhilippineMobile(value)) {
    return null;
  }

  return `+63${digits}`;
}

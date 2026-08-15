const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
};

function toValidDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value: string | null, fallback = "Not available") {
  return toValidDate(value)?.toLocaleString("en-PH", TIMESTAMP_OPTIONS) ?? fallback;
}

export function formatDateOnly(value: string | null, fallback = "Not available") {
  return toValidDate(value)?.toLocaleDateString("en-PH", DATE_OPTIONS) ?? fallback;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

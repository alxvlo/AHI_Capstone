import { describe, expect, it } from "vitest";
import { formatBytes, formatDateOnly, formatTimestamp } from "@/lib/format";

describe("formatTimestamp", () => {
  it("renders an ISO timestamp in en-PH short form", () => {
    expect(formatTimestamp("2026-03-20T04:30:00.000Z")).toContain("2026");
    expect(formatTimestamp("2026-03-20T04:30:00.000Z")).toContain("Mar");
  });

  it("returns the default fallback for null", () => {
    expect(formatTimestamp(null)).toBe("Not available");
  });

  it("returns the default fallback for an unparseable value", () => {
    expect(formatTimestamp("not-a-date")).toBe("Not available");
  });

  it("honours a custom fallback for null and for garbage alike", () => {
    expect(formatTimestamp(null, "Not set")).toBe("Not set");
    expect(formatTimestamp("not-a-date", "Unknown")).toBe("Unknown");
  });
});

describe("formatDateOnly", () => {
  it("renders a date with no time component", () => {
    const result = formatDateOnly("2026-03-20T04:30:00.000Z");

    expect(result).toContain("2026");
    expect(result).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns the default fallback for null", () => {
    expect(formatDateOnly(null)).toBe("Not available");
  });

  it("honours a custom fallback", () => {
    expect(formatDateOnly(null, "Not set")).toBe("Not set");
  });
});

describe("formatBytes", () => {
  it("renders bytes below 1 KiB with no unit conversion", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("renders kibibytes to one decimal place", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("renders mebibytes to one decimal place", () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

import { describe, expect, it } from "vitest";
import {
  extractPhilippineMobileDigits,
  formatPhilippineMobileInput,
  isValidPhilippineMobile,
  normalizePhilippineMobileForStorage,
} from "@/lib/phone";

describe("phone helpers", () => {
  it("extracts Philippine mobile digits from different formats", () => {
    expect(extractPhilippineMobileDigits("+63 912 345 6789")).toBe("9123456789");
    expect(extractPhilippineMobileDigits("0912-345-6789")).toBe("9123456789");
  });

  it("formats user input into a canonical display value", () => {
    expect(formatPhilippineMobileInput("09123456789")).toBe("+63 912 345 6789");
    expect(formatPhilippineMobileInput("abc")).toBe("");
  });

  it("validates only Philippine mobile numbers with a 9 prefix", () => {
    expect(isValidPhilippineMobile("+63 912 345 6789")).toBe(true);
    expect(isValidPhilippineMobile("+63 812 345 6789")).toBe(false);
    expect(isValidPhilippineMobile("+63 912 345 678")).toBe(false);
  });

  it("normalizes valid numbers for storage and rejects invalid input", () => {
    expect(normalizePhilippineMobileForStorage("09123456789")).toBe("+639123456789");
    expect(normalizePhilippineMobileForStorage("+63 812 345 6789")).toBeNull();
  });
});

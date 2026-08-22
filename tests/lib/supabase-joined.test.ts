import { describe, expect, it } from "vitest";
import { pickJoined } from "@/lib/supabase/joined";

describe("pickJoined", () => {
  it("returns a single embedded object unchanged", () => {
    const row = { patientid: "abc", firstname: "Ana" };

    expect(pickJoined(row)).toBe(row);
  });

  it("returns the first element of an embedded array", () => {
    const first = { patientid: "abc" };

    expect(pickJoined([first, { patientid: "def" }])).toBe(first);
  });

  it("returns null for an empty array", () => {
    expect(pickJoined([])).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(pickJoined(null)).toBeNull();
    expect(pickJoined(undefined)).toBeNull();
  });
});

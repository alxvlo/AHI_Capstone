import { describe, expect, it } from "vitest";
import {
  ADDITIONAL_TEST_REASON_MAX_LENGTH,
  ADDITIONAL_TEST_REMARK_PREFIX,
  REMARKS_MAX_LENGTH,
} from "@/features/dashboard/staff/remarks-limits";

// D-016's "must not": the limit the form advertises and the limit the write
// can honour must come from the same number. These assert the arithmetic that
// makes that true, so a later edit to the prefix cannot quietly re-open the
// gap by changing one side only.
describe("remarks limits", () => {
  it("matches the varchar(255) columns the values are written into", () => {
    // From memory-bank/database/schema.txt: peme_decision.remarks and
    // department_visit.remarks are both character varying(255).
    expect(REMARKS_MAX_LENGTH).toBe(255);
  });

  it("leaves the reason exactly the room the prefix does not take", () => {
    expect(ADDITIONAL_TEST_REASON_MAX_LENGTH).toBe(
      REMARKS_MAX_LENGTH - ADDITIONAL_TEST_REMARK_PREFIX.length
    );
  });

  it("produces a stored value that fits the column at the advertised limit", () => {
    const stored = `${ADDITIONAL_TEST_REMARK_PREFIX}${"x".repeat(ADDITIONAL_TEST_REASON_MAX_LENGTH)}`;
    expect(stored).toHaveLength(REMARKS_MAX_LENGTH);
    expect(stored.length).toBeLessThanOrEqual(REMARKS_MAX_LENGTH);
  });

  it("leaves a usable budget", () => {
    // Guards the degenerate case: a prefix long enough to leave no room would
    // satisfy the arithmetic above while making the field unusable.
    expect(ADDITIONAL_TEST_REASON_MAX_LENGTH).toBeGreaterThan(200);
  });
});

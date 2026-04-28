import { describe, expect, it } from "vitest";
import {
  computeCaseCompletion,
  computeCaseCompletionBatch,
} from "@/lib/dashboard/case-progress";

const COMPLETED_ID = 5; // arbitrary stable ID for all tests

describe("computeCaseCompletion", () => {
  it("returns zero progress when there are no visits", () => {
    const result = computeCaseCompletion([], COMPLETED_ID);

    expect(result.completed).toBe(0);
    expect(result.required).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.label).toBe("0 / 0 (0%)");
  });

  it("returns 0% when no visits are completed", () => {
    const visits = [
      { visitstatuscodeid: 1 },
      { visitstatuscodeid: 2 },
      { visitstatuscodeid: 3 },
    ];

    const result = computeCaseCompletion(visits, COMPLETED_ID);

    expect(result.completed).toBe(0);
    expect(result.required).toBe(3);
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.label).toBe("0 / 3 (0%)");
  });

  it("returns 100% and isComplete=true when all visits are completed", () => {
    const visits = [
      { visitstatuscodeid: COMPLETED_ID },
      { visitstatuscodeid: COMPLETED_ID },
    ];

    const result = computeCaseCompletion(visits, COMPLETED_ID);

    expect(result.completed).toBe(2);
    expect(result.required).toBe(2);
    expect(result.percentage).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.label).toBe("2 / 2 (100%)");
  });

  it("computes partial progress correctly and rounds percentage", () => {
    // 1 of 3 completed = 33.33% → rounds to 33
    const visits = [
      { visitstatuscodeid: COMPLETED_ID },
      { visitstatuscodeid: 2 },
      { visitstatuscodeid: 3 },
    ];

    const result = computeCaseCompletion(visits, COMPLETED_ID);

    expect(result.completed).toBe(1);
    expect(result.required).toBe(3);
    expect(result.percentage).toBe(33);
    expect(result.isComplete).toBe(false);
  });

  it("rounds 2/3 up to 67%", () => {
    const visits = [
      { visitstatuscodeid: COMPLETED_ID },
      { visitstatuscodeid: COMPLETED_ID },
      { visitstatuscodeid: 2 },
    ];

    const result = computeCaseCompletion(visits, COMPLETED_ID);

    expect(result.percentage).toBe(67);
    expect(result.isComplete).toBe(false);
  });

  it("counts only the matching completedStatusId, not other status IDs", () => {
    const visits = [
      { visitstatuscodeid: COMPLETED_ID },
      { visitstatuscodeid: COMPLETED_ID + 1 }, // different — not completed
      { visitstatuscodeid: COMPLETED_ID - 1 }, // different — not completed
    ];

    const result = computeCaseCompletion(visits, COMPLETED_ID);

    expect(result.completed).toBe(1);
    expect(result.required).toBe(3);
  });

  it("handles a single completed visit", () => {
    const result = computeCaseCompletion([{ visitstatuscodeid: COMPLETED_ID }], COMPLETED_ID);

    expect(result.completed).toBe(1);
    expect(result.required).toBe(1);
    expect(result.percentage).toBe(100);
    expect(result.isComplete).toBe(true);
  });

  it("handles a single pending visit", () => {
    const result = computeCaseCompletion([{ visitstatuscodeid: 99 }], COMPLETED_ID);

    expect(result.completed).toBe(0);
    expect(result.required).toBe(1);
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(false);
  });
});

describe("computeCaseCompletionBatch", () => {
  it("returns an entry for every requested case ID", () => {
    const caseIds = ["case-a", "case-b", "case-c"];
    const allVisits = [
      { caseid: "case-a", visitstatuscodeid: COMPLETED_ID },
      { caseid: "case-b", visitstatuscodeid: 2 },
      { caseid: "case-b", visitstatuscodeid: COMPLETED_ID },
    ];

    const result = computeCaseCompletionBatch(caseIds, allVisits, COMPLETED_ID);

    expect(result.size).toBe(3);
  });

  it("correctly partitions visits by case", () => {
    const caseIds = ["case-a", "case-b"];
    const allVisits = [
      { caseid: "case-a", visitstatuscodeid: COMPLETED_ID },
      { caseid: "case-a", visitstatuscodeid: COMPLETED_ID },
      { caseid: "case-b", visitstatuscodeid: 2 },
      { caseid: "case-b", visitstatuscodeid: COMPLETED_ID },
    ];

    const result = computeCaseCompletionBatch(caseIds, allVisits, COMPLETED_ID);

    const a = result.get("case-a")!;
    const b = result.get("case-b")!;

    expect(a.completed).toBe(2);
    expect(a.required).toBe(2);
    expect(a.isComplete).toBe(true);

    expect(b.completed).toBe(1);
    expect(b.required).toBe(2);
    expect(b.isComplete).toBe(false);
  });

  it("returns zero-progress for a case ID with no visits in the flat list", () => {
    const caseIds = ["case-a", "case-orphan"];
    const allVisits = [{ caseid: "case-a", visitstatuscodeid: COMPLETED_ID }];

    const result = computeCaseCompletionBatch(caseIds, allVisits, COMPLETED_ID);

    const orphan = result.get("case-orphan")!;

    expect(orphan.completed).toBe(0);
    expect(orphan.required).toBe(0);
    expect(orphan.isComplete).toBe(false);
  });

  it("handles an empty caseIds list without error", () => {
    const result = computeCaseCompletionBatch([], [], COMPLETED_ID);

    expect(result.size).toBe(0);
  });

  it("produces correct labels in batch results", () => {
    const caseIds = ["case-x"];
    const allVisits = [
      { caseid: "case-x", visitstatuscodeid: COMPLETED_ID },
      { caseid: "case-x", visitstatuscodeid: 2 },
      { caseid: "case-x", visitstatuscodeid: 3 },
      { caseid: "case-x", visitstatuscodeid: 4 },
    ];

    const result = computeCaseCompletionBatch(caseIds, allVisits, COMPLETED_ID);
    const x = result.get("case-x")!;

    expect(x.label).toBe("1 / 4 (25%)");
  });
});

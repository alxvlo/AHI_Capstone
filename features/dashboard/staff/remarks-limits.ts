// Column widths, and the client-side limits derived from them.
//
// D-015 and D-016 were both the same drift: a form advertising one maximum
// while the server persisted another. Keeping the numbers here, and deriving
// rather than repeating them, is what stops that recurring — the "must not"
// clause on D-016 requires the visible limit and the persisted limit to come
// from the same number.

/** `peme_decision.remarks` and `department_visit.remarks` are both varchar(255). */
export const REMARKS_MAX_LENGTH = 255;

/** Prefixed onto the physician's reason before it is stored on the visit. */
export const ADDITIONAL_TEST_REMARK_PREFIX = "Additional test requested: ";

/**
 * What a physician may actually type as an additional-test reason.
 *
 * The prefix is added server-side and spends the same 255 characters, so a
 * form advertising the full width promises a budget the write cannot honour.
 * That was D-016: a reason typed at the visible limit lost its last
 * ADDITIONAL_TEST_REMARK_PREFIX.length characters in what Department Staff
 * actually read.
 */
export const ADDITIONAL_TEST_REASON_MAX_LENGTH =
  REMARKS_MAX_LENGTH - ADDITIONAL_TEST_REMARK_PREFIX.length;

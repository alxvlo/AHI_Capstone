---
paths:
  - "tests/**"
  - "**/*.{test,spec}.{ts,tsx}"
  - "vitest.config.*"
  - "playwright.config.*"
---

# Writing tests in this repo

Ordering and honesty rules are in `.claude/rules/verification.md`, which loads at launch. Style
conventions are in `AGENTS.md`. This is the mechanics of a good check here.

## Keeping the check independent of the code

- **Name the case after the behavior:** `"blocks client portal access when the waiver is unsigned"`,
  not `"buildReturnPath returns null"`. The first survives a refactor; the second describes the
  implementation.
- **Assert at the boundary.** The redirect target, the HTTP status, the `peme_case` row that landed,
  the rendered text. Not private helpers, not call counts on internal functions.
- **Don't mock the thing under test.** Mock its collaborators. A test where the mock supplies the
  answer is a test of the mock. Supabase clients get mocked at the module boundary with
  `vi.mock(...)`; the logic under test does not.
- **A test that passes both before and after your change proves nothing about your change.** If you
  can't make it fail by reverting the implementation, it isn't covering the implementation.

## Boundaries worth covering here

Write these into the acceptance criteria before implementing, then honour the list:

- Every role in the matrix, including the one that should be **denied** — all eight, not just the
  one the ticket is about
- `waiversigned = false`, `portalvisible = false`, and both together
- Illegal case-lifecycle transitions, not just the legal ones (e.g. `RELEASED` → `IN_PROGRESS`)
- Expired session, missing `user_account` row, patient with no `peme_case`
- Empty, null, zero, duplicate submission, and unauthorized

Negative assertions are the ones most often skipped and the ones a fitted test never contains.

## Mechanics

- Vitest + Testing Library + jsdom for units and components; Playwright for browser QA.
- Run the single case while iterating so you can actually see red then green:
  `npm run test:run -- tests/lib/phone.test.ts -t "extracts Philippine mobile digits"`
- `npm run qa:local` (lint + typecheck + test:run) before handing off anything non-trivial.
- Prefer deterministic tests over snapshots. An unread snapshot is not a test, and re-recording one
  to reach green is the purest form of fitting the test to the code.
- Build mocks with small factory helpers; reset with `vi.clearAllMocks()`.
- Hooks and providers: follow the existing `renderHook` + `act` + `waitFor` style.
- `audit:*` / `probe:*` / `seed:*` and `qa:supabase` hit a real Supabase project via `.env.local`.
  Seeded dev/staging only — never production, and never against a project you did not seed yourself.

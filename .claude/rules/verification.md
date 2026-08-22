# Verification standard

<!-- No `paths:` frontmatter — this loads at launch in every session in this repo, on purpose.
     A rule scoped to tests/** would only load once a test file is open, which is already too
     late for a rule about what to do first. -->

Team standard for AHI-Capstone. Applies to Claude and to all three of us. `AGENTS.md` covers how
to write code here; this covers what it means to say the code works.

## Decide how it will be proven before you build it

A check written after the implementation describes what the code happens to do, not what it was
supposed to do. It passes, and it has proved nothing. "I built it, then I tested it" is
**unverified work** — it just doesn't look like it.

For any non-trivial slice or fix:

1. **Write acceptance criteria first**, from the requirement — not from your plan for satisfying
   it. Include what must NOT happen and the boundary cases, not just the happy path. Put them in
   the slice's spec under `docs/superpowers/specs/`, or in the `memory-bank/current-sprint.md`
   entry, before you start. Criteria that live only in a chat window get quietly revised to match
   whatever got built.
2. **Write the check and watch it fail.** A new test that passes against unmodified code is not
   testing the new thing. Stop and fix the test — do not proceed.
3. **Confirm it fails for the right reason.** Predict the failure first. An assertion failure
   showing the expected-vs-actual you predicted is proof. An import error or a crash is not — that
   only proves the code isn't written yet.
4. **Then implement**, changing only what turns the check green.
5. **Report criteria and result separately** in the PR or handoff: what was supposed to be true,
   what you actually ran, what happened, and what is still unchecked. Not the bare word "verified".

## Rules that keep a check honest

- **Expected values never come from running the code.** Derive them from the requirement, a hand
  calculation, or `memory-bank/database/schema.txt`. Running it and pasting the output in as
  `expected` is how a check gets fitted to a bug.
- **Assert observable behavior** — the redirect target, the HTTP status, the row that landed, the
  text the user sees — not internal helper names that exist only because of how you chose to solve
  it. If a behavior-preserving refactor would break the assertion, the assertion is wrong.
- **Never weaken a check to reach green.** No loosened matcher, widened tolerance, deleted case,
  `.skip`, downgrade to a truthiness assertion, try/catch swallow, or re-recorded snapshot.
- **Never edit an assertion silently after seeing it fail.** A check can be wrong — say it was
  wrong, say why, get agreement. Flag it in the PR if the acceptance criteria themselves moved.
- **Assert the negatives.** Whatever the requirement says must not happen gets an explicit
  assertion. A fitted test never contains these, because the code already does the happy path.

## Defects

A `D-NNN` in `memory-bank/qa-runs/defect-log.md` is not fixed until:

1. A test **reproduces the reported symptom** and was seen failing with that symptom, and
2. the fix turns it green, and
3. the test is named after the defect ID so the regression stays traceable.

If you cannot reproduce it, say so. Do not fix a defect you could not make appear — you will be
guessing at the cause, and the test will confirm the guess rather than the behavior.

## Where this matters most

Auth, role resolution and redirects, the DPA gating flags (`waiversigned`, `portalvisible`), RLS
policies, audit-log writes, and result-file access. For changes touching any of these, have the
work checked against **only the requirement and the finished diff** — no implementation notes, no
reasoning. Ask the reviewer to find where it is wrong, not to confirm it is right. A reviewer who
has read your reasoning tends to inherit your blind spot.

## Honest exemptions

Spikes, one-line tweaks, copy changes, and "let me see what this does" don't need this. Label them
unverified rather than folding them into a green report. The failure we are preventing is not
unverified work — it is unverified work reported as verified.

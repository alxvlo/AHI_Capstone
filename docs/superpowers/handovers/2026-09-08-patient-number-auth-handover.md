# Handover — Permanent patient number and authentication by patient number

**For:** Alex
**From:** Keith (with Claude), 2026-09-08
**Status:** Not started. This is context, not a design — the design is yours.

---

## What this document is, and what it is not

This is **not a spec** and not a plan. You own both. It exists so you do not have to rediscover
what has already been read out of the codebase and the clinic spec.

It contains: the problem, the constraint that shapes every possible solution, three approaches
with the reasoning that separates them, the exact files involved, the rules this repo enforces,
and the decisions that are yours to make.

Where it states a fact about the code, that fact was checked against the file, and the citation is
given so you can check it too. Where it states an opinion, it says so.

**Suggested route:** `superpowers:brainstorming` → `superpowers:writing-plans` →
`superpowers:subagent-driven-development`. That is the path the local-development environment took
on 2026-09-08 and it worked well — the final whole-branch review caught a critical defect that
five per-task reviews had all missed.

---

## 1. Why this work exists

From §5 of `docs/superpowers/specs/2026-09-02-clinic-architecture-adaptation-design.md`, which
records the 2026-09-02 onsite visit:

> the present transaction number restarts at zero every month, so it cannot identify a returning
> patient.

The clinic's patient identity resets monthly. A worker examined in March and returning in
September is a stranger to the system. Everything downstream depends on that being fixed:
returning-patient history, repeat medicals, and the agency's own records.

Two changes travel together: patients get a **permanent number**, and that number becomes **how
they sign in**.

This is item 1 on the post-onsite priority queue in `memory-bank/current-sprint.md`, described
there as depending on nothing and nobody. It does not need the local Supabase stack to design, and
it does not need any outstanding answer from AHI.

---

## 2. Why patient number, and why not the alternatives

**Not email**, because deployment is moving on-premise and the clinic has no SMTP and is not
getting one. Email authentication would mean installing, securing and documenting a mail service
on a clinic LAN — an entire subsystem, and one the Installation Guide would have to cover.

**Not date of birth**, which is what the clinic's previous online system used. §5 rejects it
outright: *"It is not a secret, and this is medical data under RA 10173."* That reasoning is worth
keeping visible in the manuscript, not just in the code.

**Patient number works** because patients are physically present at a reception desk holding a
printed slip. There is no reason to route identity through an inbox.

---

## 3. The constraint that shapes everything

**Supabase Auth authenticates by email.** There is exactly one sign-in call in the codebase:

- `components/providers/auth-provider.tsx:298` — `supabase.auth.signInWithPassword({ email, password })`

It is wrapped by `login(email, password)` at `components/providers/auth-provider.tsx:296`, and all
three sign-in pages call that one function:

- `app/auth/patient/sign-in/page.tsx:48`
- `app/auth/staff/sign-in/page.tsx:43`
- `app/auth/agency/sign-in/page.tsx:45`

There is no Supabase API for signing in with an arbitrary identifier. So "log in with a patient
number" must be built on top of an email-shaped call. That single seam is good news for the size
of the change; the constraint is what makes the design non-obvious.

**Only the patient path changes.** Staff and agency users keep signing in with email.

---

## 4. Three approaches, and why they are not equal

### A. Synthetic email address — *recommended, but it is your call*

Mint auth users as `<patientnumber>@<internal-domain>`. The sign-in form takes a patient number;
the code appends the domain and calls the existing `login()`.

### B. Server-side lookup — *looks right, and is not*

The form takes a patient number, a server action resolves it to the patient's stored email, then
signs in with that.

This is the approach most people reach for. **Read this before choosing it.**

The acceptance criteria in §7 of the architecture spec include:

> A patient number that exists with a wrong password is rejected with the same message and timing
> as one that does not exist — enumeration must not be possible.

With **A**, both cases go through the same `signInWithPassword` call and Supabase returns one
generic error. The property is free.

With **B**, a database lookup happens *before* authentication, and it distinguishes "this patient
number exists" from "it does not" — in the response and in the timing. Satisfying the criterion
means deliberately faking uniform timing, which is fragile and easy to regress.

**B has two further problems.** It requires service-role database access on an unauthenticated
route, which is a real security surface that does not exist today. And it requires every patient
to have a stored email, when §7 states *"No email is required at registration."*

### C. Custom JWT or replacing Supabase Auth

Out of scope by a wide margin. Recorded only so nobody proposes it as new.

### If you choose A, be aware

The synthetic address is a login identifier, not a mailbox — nothing may ever send to it. No SMTP
is deployed, so this holds by construction today, but it should be written down. Note also that
changing a patient's number would change their auth identity; the number is specified as permanent,
so this is a reason to get generation right rather than a reason to avoid A.

---

## 5. What changes in the database

One new column and one migration on `patient` (`memory-bank/database/schema.txt:60`), which today
carries only a UUID primary key and a unique `governmentid`.

The number must be:

- **Unique** — enforced by a database constraint, not by an application check. §7 requires that
  *"concurrent registrations must not produce a collision"*, and a read-then-write check in
  TypeScript loses that race. Let Postgres own it.
- **Permanent** — never changed, never reused for a different patient, stable across months.
- **Not a join key.** §7 is explicit: *"The existing `patientid` UUID remains the foreign key
  everywhere; the patient number must not become a join key."* It is for humans and for login.
  Every foreign key in the schema stays on `patientid`.

Existing patients need backfilling in the same migration.

Relevant context on how identity is wired today: `user_account`
(`memory-bank/database/schema.txt:155`) joins `auth.users` to `patient` — `userid` is the auth
user, `patientid` is the FK to `patient`, and `username` already carries a uniqueness constraint.

---

## 6. What changes in the codebase

| File | Change |
|---|---|
| `components/providers/auth-provider.tsx:296` | `login()` — the one seam; gains the patient-number path |
| `components/providers/auth-provider.tsx:425` | `signUp()` — stops requiring an email |
| `app/auth/patient/sign-in/page.tsx:110` | the field stops being `type="email"` |
| `app/auth/patient/sign-up/page.tsx` | no email collected |
| `app/auth/patient/forgot-password/`, `app/auth/patient/check-email/` | become dead — see §7 below |
| `features/dashboard/staff/actions.ts` | Reception registration mints the patient number |

---

## 7. The consequence that is easy to miss

**Password resets become a Reception desk task.** §5 accepts this cost deliberately, on the grounds
that patients are physically present at registration.

But it means work nobody has scoped yet: Reception needs an action to reset a patient's password,
with a role gate and an audit row. Today there is no such thing — patients self-serve by email, and
those two routes above become unreachable.

Decide explicitly whether that belongs in this spec or a follow-on. If it is deferred, patients who
forget a password have no route at all, which is worse than the current state.

---

## 8. What must NOT change

§7 of the architecture spec states:

> Existing role routing (`lib/supabase/role-routing.ts`, `roles.ts`, `lib/supabase/middleware.ts`)
> is unchanged; no role gains access to a route it could not reach before.

`CLAUDE.md` names those three files as a single unit that must stay consistent. This change is
about **how a patient proves who they are**, not about what any role may reach. If your diff
touches role resolution, treat that as a signal that something has gone wrong.

`.claude/rules/verification.md` also names auth, role resolution and redirects as the areas where
review must be hardest, and asks that such work be checked against **only the requirement and the
finished diff** — no implementation notes, no reasoning. Ask your reviewer to find where it is
wrong, not to confirm it is right.

---

## 9. Rules, guards and safety — read before running anything

**The repo is public.** `github.com/alxvlo/AHI_Capstone`. Assume anything committed is readable by
anyone.

**Never commit a real credential, and never transcribe patient data.** No `governmentid`, date of
birth, or full name from any real or seeded record belongs in a document, a test fixture, or a
commit message — and recognisable fragments count. A commit message on 2026-09-07 had to be amended
because it quoted variable names that embedded parts of seeded patient names.

**Never `git add .` or `git add -A`.** Always explicit paths.

**Do not write to the cloud Supabase projects.** As of 2026-09-08 six scripts refuse a non-local
target — the four seed/teardown/bootstrap scripts and both `audit:write:*` validators. That guard
is real but it is not total:

- **A migration is applied by the Supabase CLI, not by a guarded script.** Nothing stops
  `supabase db push`. Hold your migration until you have a local stack.
- `npm run probe:cleanup` targets the linked cloud project by construction and requires
  `AHI_ALLOW_CLOUD_WRITES=1`.

**Get a local stack before implementing.** `memory-bank/guides/local-development.md` is the
runbook. Keith is walking it first and fixing whatever it gets wrong, so wait for his pass if you
can — you will inherit a debugged document.

**Before any deployment**, the probe password must be rotated. See "Before anything is deployed" in
the local-development runbook. Not urgent today; a hard gate before anything ships.

**Verification standard.** `.claude/rules/verification.md` is a team standard, not advice. Write
acceptance criteria before you build, watch the check fail for the reason you predicted, and never
weaken an assertion to reach green. For this work the criteria are already written — §7 of the
architecture spec — which removes the hardest part of starting.

**Shared file warning.** `memory-bank/current-sprint.md` is edited by everyone and produced a merge
conflict on 2026-09-07. Agree with Keith who updates it, or take turns.

---

## 10. Decisions that are yours

Neither is pre-made. Both change the shape of the work.

1. **Existing patient accounts.** Seeded and demo patients have email-based auth users today. Do
   they migrate to the new identity, or get reset and recreated? This decides whether the migration
   is backfill-only or has to touch `auth.users`.

2. **Scope of the reception slip.** §5 pairs the patient number with a printed slip carrying it as
   a barcode. It depends on this work but is separable. Keith's instinct was to spec the number and
   auth first and leave the slip as a follow-on, so the change stays reviewable — but it is your
   call, and the slip is part of what the clinic actually asked for.

A third, smaller one: whether Reception-led password reset (§7 above) is in scope here or next.

---

## 11. What has been verified, and what has not

**Verified against the files**, on 2026-09-08, at the citations given above: the single
`signInWithPassword` call site and its three callers, the `signUp` call site, the patient sign-in
page's email field, and the `patient` and `user_account` table definitions in `schema.txt`.

**Not verified, and not attempted:** nothing in this document has been run against a database. No
migration was written, no auth flow was executed, and no local stack existed when it was written.
The recommendation of approach A is reasoning from the acceptance criteria, not an experimental
result. Treat it as a strong argument to check, not a conclusion to inherit.

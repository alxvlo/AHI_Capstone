# Chapter 4 — Consistency Review and Change Log

**Source:** `Chapter-4.md` (uploaded draft, 2026-05-23)
**Reviewer:** Claude
**Repo verified against:** `main` at `e81c48d` (Phase 5 — QA hardening), per `memory-bank/current-sprint.md`.

This document lists every change applied to the chapter (and every change *not* applied because it required a judgment call by the author), with the source-of-truth file or screenshot that justifies the change. Severity tags: **F** = factual error, **I** = inconsistency, **P** = prose, **N** = nit.

---

## 1. Section numbering (F)

**Location:** Document structure.
**Problem:** The chapter jumps from `## 4.1 Program Description` to `## 4.3 Screen Hierarchy`. No `## 4.2` section exists, so any reader (and the manuscript reviewer) will assume a section is missing.
**Action:** Added an explicit `## 4.2 System Requirements` section header with a short paragraph that bridges 4.1 and 4.3 and references the corresponding Chapter 3 design content (functional, non-functional, and platform requirements). The actual requirement details live in Chapter 3; 4.2 only confirms that the as-built system satisfies them and points the reader to where the build differs from the design. If the manuscript template explicitly requires a different 4.2 (e.g., "Hardware Requirements"), replace the inserted body — the header restoration is what matters.

## 2. Markdown export artifacts — escaped periods (P)

**Location:** Throughout. Examples: "as described in Chapter 3\.", "Section 4.1\.", "rerouted\."
**Problem:** Backslash-escaped periods (`\.`) appear repeatedly. These are from a previous Markdown export and render as literal `\.` in many viewers.
**Action:** Removed every trailing `\.` artifact. Count fixed: 18 occurrences.

## 3. Tech stack version specifics (F)

**Location:** §4.1, paragraph beginning "The program is implemented as a three-tier cloud-native..."
**Source-of-truth:** `package.json`, `memory-bank/tech-stack.md`.
**Problem:** The chapter says "Next.js (App Router) and React" without versions. The verified stack is Next.js 15.2.2, React 19, Tailwind CSS 4.0.14, Supabase JS 2.49.4, `@supabase/ssr` 0.9.0.
**Action:** Added version numbers ("Next.js 15, React 19, Tailwind CSS 4, …") so the chapter matches the verified `package.json` without overstating exact patch versions.

## 4. Phase / sprint state stale (F)

**Location:** Implicit in §4.1 ("the version of the program documented in this draft") and §4.4.2.4 (Deferred Features).
**Source-of-truth:** `memory-bank/current-sprint.md` (Phase 5 — QA hardening; Sprint A Risk Closure and Sprint B Test Coverage Closure both completed).
**Problem:** `CLAUDE.md` still calls the project "Phase 4 — Backend Wiring." That is *out of date*. The chapter inherits the implication ("the program described in this section is the proponents' bespoke software response … at the time of writing"). It is fine for the chapter to be neutral about phase number, but it should not under-claim what has been done — Sprint A Risk Closure (terminal visit-state sync, govID uniqueness, open-visit uniqueness, triage RLS, orphan-file sweeper, result-item idempotency, etc.) and Sprint B Test Coverage Closure (64 added unit tests, Playwright smoke specs) are post-Slice 15 work that the §4.4.1 "Maintainability" claims now rely on.
**Action:** Reworded §4.4.1.1 to state that the test/QA baseline includes those closures, and §4.4.2.4 now lists the four deferred items in the same wording `current-sprint.md` uses ("Email audit actor propagation — deferred", "Parental/guardian consent for under-18 patients — deferred", "SCRUM-38 deployment authorization — deferred", "PDF certificate renderer — pending AHI template").

## 5. "Approximately fifty" tests — actual count is 58 (F, minor)

**Location:** §4.1 ("approximately fifty clinical and laboratory tests grouped by category").
**Source-of-truth:** Test Catalog screenshot (`figure-4-34-admin-test-catalog.jpg`) — header reads "Test Catalog (58 entries)".
**Problem:** "Approximately fifty" rounds *down* and slightly misrepresents scope.
**Action:** Changed to "approximately sixty" in the prose. Kept the qualifier "approximately" because seed content can change.

## 6. Test catalog categories listed in §4.3.7.5 are incomplete (I)

**Location:** §4.3.7.5 — "grouped by category (for example hematology, urinalysis, radiology, vision, and physical)".
**Source-of-truth:** Admin Test Catalog screenshot — categories present: **Chemistry, Drug Test, Hematology, Serology, Urinalysis, Imaging, Cardiology, Diagnostic, Dental, Phys_exam** (ten distinct categories).
**Problem:** The chapter lists five categories, three of which ("radiology", "vision", "physical") do not exist as named categories — the closest analogues are "Imaging" (radiology) and "Phys_exam" (physical examination). "Vision" does not appear; the closest is "Diagnostic" (which holds Audiometry) — there is no Vision/Acuity category in the seed.
**Action:** Updated the category list to a more accurate sample: "for example chemistry, hematology, urinalysis, serology, imaging, drug testing, cardiology, dental, and physical examination."

## 7. Department UI is a queue *table*, not a Kanban *board* (I)

**Location:** §4.1 ("manual-pull Kanban model") and §4.3.6.3 ("The queue exposes the manual-pull Kanban model — Pending, In-Progress, Completed").
**Source-of-truth:** `figure-4-20-dept-queue.jpg` — the queue is rendered as a single sortable table with a Visit Status column; the four pre-table metric tiles are *Pending / In Progress / Skipped / Completed*. There is no card-based Kanban board; visits do not move between visual columns.
**Problem:** Repeated use of "Kanban" is misleading — a manuscript reader will picture the wrong UI.
**Action:** Replaced "Kanban" with "queue table with manual status progression" in both §4.1 and §4.3.6.3. Kept the underlying behavioural claim ("staff explicitly pull the next visit") because that is what the table affords.

## 8. Skipped column is part of the queue (I)

**Location:** §4.3.6.3 ("Pending, In-Progress, Completed").
**Source-of-truth:** `figure-4-20-dept-queue.jpg`.
**Problem:** The actual queue exposes a fourth metric tile and visit state — **Skipped** — alongside the three listed. The chapter mentions "a separate skip-and-requeue path" later in the same paragraph but does not list Skipped among the queue states.
**Action:** Added Skipped to the listed states ("Pending, In-Progress, Skipped, Completed") and clarified that Skipped is the visible terminal state for the skip-and-requeue path.

## 9. Patient lookup search fields (I)

**Location:** §4.3.6.1 ("patient search by name, date of birth, and government-issued identifier").
**Source-of-truth:** `figure-4-15-reception-patient-search.jpg` — the Patient Lookup field is a single text input labelled "Search by full name, ID number, or email." There is no DOB search field.
**Problem:** The chapter claims a DOB search exists; it does not (search is by name, ID, or email). DOB is collected at registration, not exposed as a lookup field.
**Action:** Rewrote the sentence: "patient search by full name, government-issued identifier, or email address." Kept the description of the identifier-type enumeration that *does* exist (Passport / National ID / Driver's License / Other Government ID — confirmed in the Register New Patient form on `figure-4-15`).

## 10. Patient registry load error visible in live build (I, observational)

**Location:** Not currently mentioned in §4.3.6.1.
**Source-of-truth:** `figure-4-15-reception-patient-search.jpg` — the Patient Lookup section shows "Unable to load patient records: Unregistered API key" as a red error message, with "No patient records found." below it.
**Problem:** The screenshot shows a live data-fetch failure in the Reception module's patient search. This is *not* a chapter prose issue — it is a real defect: the patient-lookup query is failing against Supabase at the time of capture, likely because the probe Reception account is missing either an RLS grant or an API key configuration.
**Action:** **Did not modify the chapter prose** — this is a build defect that the proponents should triage (probably surfacing under SCRUM-32 defect triage). I noted it here so the proponents can investigate; the chapter does not need to call it out.

## 11. Client portal — DPA-gated search is *implemented*, not future scope (F)

**Location:** §4.3.9.2 — "Released Case Search (future scope: DPA-gated search)" and the corresponding hierarchy line in §4.3.2.
**Source-of-truth:** `figure-4-40-client-search.jpg` — the Client Representative Dashboard renders a "Search and Filter" panel with three real inputs ("Search name, case number, or identifier" + two date fields) and Apply / Clear buttons. The "Acknowledge DPA Notice" gate exists above it but the search is visibly built.
**Problem:** The chapter marks the search as future scope and says it "is not yet exercised in the current build." That is no longer accurate.
**Action:** Updated §4.3.9.2 to describe the search as implemented (subject to the DPA acknowledgement gate). Removed the "future scope" tag from §4.3.2 for that line.

## 12. Unauthorized notice page is currently returning 500 (F)

**Location:** §4.3.10.1 — describes the unauthorized page as having "a reason code (for example, role mismatch or missing department claim) and a return-to-dashboard action."
**Source-of-truth:** Live navigation to `/unauthorized` returned a Next.js *Internal Server Error* response on 2026-05-23 regardless of whether the requester was signed in. The page source (`app/unauthorized/page.tsx`) is a client component that calls `useAuth()` — the route renders fine in unit tests but throws in the running dev server.
**Problem:** The chapter describes a working screen; the screen is presently broken. This is a build defect, not a prose error, but the chapter's screenshot callout (`Figure 4.43`) cannot be satisfied with a real capture.
**Action:** Inserted a short note in §4.3.10.1 acknowledging that the unauthorized notice's runtime behaviour is currently being repaired (defect ticketed under Sprint C compliance planning) and that the figure shows the intended design surfaced through the source layout rather than a runtime capture. **Proponents should remove this note once the page is fixed.** Used a layout-derived mock (annotated) for Figure 4.43 instead of the broken 500 screen.

## 13. Triage / Physician empty queues (I, observational)

**Location:** §4.3.6.2 (Triage Nurse Module) and §4.3.6.4 (Physician Module).
**Source-of-truth:** `figure-4-18-triage-queue.jpg`, `figure-4-24-physician-queue.jpg` — both show empty queues at the time of capture ("No cases waiting for triage", "No cases waiting for physician decision").
**Problem:** Figures 4.19 (Triage assessment form), 4.25 (Physician consolidated summary), 4.26 (Fitness decision form), and 4.27 (Request additional tests dialog) cannot be captured against the current seed state because no cases exist in REGISTERED-not-yet-triaged or FOR_DECISION states.
**Action:** Replaced those four figure callouts with consolidated callouts that point to the same queue figure and added a one-sentence note that the detail panels are reachable only when a case sits in the queue. **Proponents should re-capture these four figures after seeding a REGISTERED case (e.g., via a fresh Reception walk-in registration) and a FOR_DECISION case (via completing all visits on an existing case).**

## 14. Mobile dashboard shell (I, technical limitation)

**Location:** §4.3.5.1.
**Problem:** Figure 4.13 was to show the responsive/mobile dashboard shell. The capture pipeline used (`html-to-image` against `document.body`) does not honour `window.resizeTo` — the captured DOM stays at the desktop layout regardless of viewport width, because the Tailwind 4 mobile breakpoints are driven by CSS media queries that depend on the *real* device width, not the JS-reported width. The same issue would not affect a browser DevTools "mobile emulation" capture.
**Action:** Kept the desktop capture for Figure 4.12 and replaced Figure 4.13 with a side-by-side narrow-viewport mock derived from the existing layout (annotated as such in the caption). **Proponents can replace this with a real mobile screenshot taken via Chrome DevTools "Toggle device toolbar" mode.**

## 15. SCRUM-30 (Realtime) and SCRUM-36 (Email) status (F)

**Location:** §4.1 — Realtime subscription + email pipeline are described as live; §4.4.1.3 reiterates.
**Source-of-truth:** `memory-bank/current-sprint.md` (2026-05-08 entries) confirms SCRUM-30 and SCRUM-36 are *implemented*. `CLAUDE.md`'s line that calls them "closed in Jira but have no code in the repo — treat as unverified" is itself stale.
**Problem:** The chapter is correct *on the implementation*. No change needed for the substantive claims. However the language ("a lightweight subscription layer composed of a useRealtimeRefresh hook and a RealtimeBridge component") was lifted from the implementation file names — accurate but a bit too jargony for a manuscript audience.
**Action:** Light prose softening in §4.1 — kept the implementation specifics but added a half-sentence explaining that the layer auto-refreshes the visible page server-side. No claims removed.

## 16. Rate limit numbers added for completeness (P)

**Location:** §4.1 ("rate limiting on the sign-in endpoints") and §4.4.1.3 ("application-layer rate limiting on all /auth/* endpoints").
**Source-of-truth:** `lib/supabase/middleware.ts` lines 15–16: `AUTH_RATE_LIMIT_WINDOW_MS = 60_000`, `AUTH_RATE_LIMIT_MAX_REQUESTS = 10`.
**Problem:** The chapter mentions rate limiting twice but never states the policy. A manuscript reader would prefer a concrete number.
**Action:** Added "(ten requests per IP per sixty-second sliding window)" to the §4.4.1.3 description. Left §4.1 unchanged (concise overview).

## 17. File-upload format/size restated in §4.3.6.3 (P)

**Location:** §4.3.6.3.
**Source-of-truth:** `figure-4-22-dept-file-upload.jpg` shows "Accepted: JPEG, PNG, PDF • Max 10 MB" directly in the UI; `decisions.md` confirms.
**Problem:** §4.4.1.3 mentions JPEG/PNG/PDF + 10 MB but §4.3.6.3 — where the upload control actually appears — is silent on it.
**Action:** Added a short clause to §4.3.6.3 describing the format/size limit so the reader sees it where the figure is referenced.

## 18. "Hybrid package-fence rule" — wording aligned (P, N)

**Location:** §4.1, §4.3.6.3.
**Source-of-truth:** `decisions.md` 2026-05-12 entry — "required tests cannot be removed, but off-package extras are always allowed."
**Problem:** The chapter calls it the "hybrid package-fence rule." That phrase is fine but appears only in two places without a definition near the first use.
**Action:** Added a parenthetical gloss at first use in §4.1 ("the hybrid package-fence rule — required tests cannot be removed; off-package extras are always allowed"). Removed the second mention of "described in Section 4.1" in §4.3.6.3 since the rule is now self-defined at first use.

## 19. PDF certificate scope wording (P)

**Location:** §4.1 last-paragraph-but-one and §4.3.8.4.
**Source-of-truth:** `memory-bank/current-sprint.md` lists "PDF certificate generation — still pending AHI template/signature requirements." The download entrypoint, server-side authorization, and storage-path validation are implemented; only the renderer is deferred.
**Problem:** The chapter says this clearly in §4.3.8.4 but the §4.1 wording ("the certificate-download entrypoint and the server action that authorizes the download have been implemented but the renderer is awaiting AHI's official certificate template") could be misread as saying *both* are pending.
**Action:** Rephrased §4.1 slightly to lead with the implemented pieces ("the download entrypoint, the server action that authorizes and validates it, and the storage-path scoping are implemented; only the PDF renderer is deferred"). §4.3.8.4 already had the precise version and was left in place.

## 20. CLAUDE.md cross-reference (N, did not change)

**Location:** Several passages call out memory-bank documents by filename.
**Problem:** Filenames like `memory-bank/decisions.md` are appropriate in the prose because the chapter uses them as exhibits in §4.4.1.1 ("architectural decisions are recorded in the repository's memory-bank/decisions.md log"). They are not noise.
**Action:** Left as-is. If a manuscript reviewer objects to a code-style filename appearing in body prose, replace with a generic reference ("the project's architectural decisions log").

## 21. Figure callout numbering (P)

**Location:** Throughout §4.3.
**Problem:** The chapter has 43 figure callouts but several of those (4.19, 4.25–4.27, 4.43, 4.13) cannot be satisfied by real captures in the current build state (see items 12, 13, 14 above).
**Action:** Kept the figure callouts at their original numbers; updated the captions to indicate when a figure is layout-derived or queue-empty rather than a live capture. **Did not renumber** because re-numbering downstream figures in a manuscript draft is more disruptive than reusing the same number with a clarifying caption.

## 22. "Approximately fifty" → "approximately sixty" — also references §4.3.6.3 (P)

**Location:** §4.3.6.3 ("driven by the seeded Test Catalog introduced in Section 4.1").
**Problem:** Same issue as item 5 — the linked count carries forward.
**Action:** §4.3.6.3 no longer states a count; it relies on the §4.1 figure.

---

## Items considered and intentionally left alone

- **Branding inconsistency.** The live UI's logo says "American Outpatient Clinic (American Hospital, Inc.)" but the chapter and project documentation use "American Hospital Inc." This is *not* an inconsistency — it is the institution's actual dual-name brand. Left as-is.
- **`memory-bank/auth-implementation-decision.md`** is referenced indirectly (§4.1 mentions Patient signup via `create_patient_profile`, etc.). The chapter's claims match the decision document.
- **`docs/database/schema.txt`** confirms the 12-table claim; left unchanged.
- **Lifecycle state names** (`REGISTERED`, `IN_PROGRESS`, `FOR_DECISION`, `FOR_RELEASING`, `RELEASED`, `ARCHIVED`, `PENDING_ADDITIONAL_TESTS`) match the codebase. The chapter uses spaced-and-titled-cased forms ("In-Progress", "For-Decision") in prose, which is fine for a manuscript audience.
- **Shneiderman's Eight Golden Rules framing** in §4.3.1 — left untouched. Properly named and consistently referenced.

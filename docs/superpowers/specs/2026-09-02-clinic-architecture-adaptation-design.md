# Clinic Architecture Adaptation — Design

**Date:** 2026-09-02, revised 2026-09-03
**Status:** Design settled; decisions recorded in `memory-bank/decisions.md`. Implementation not
started. Open items are listed in §8 and §11 — none of them block starting.
**Author:** Drafted with Claude from the 2026-09-02 onsite transcript
**Supersedes:** nothing. Amends `memory-bank/pid.md` (see §3).
**Complements:** `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, whose §7
explicitly excluded deployment and hosting decisions. This document supplies them.

---

## 1. Why this document exists

On 2026-09-02 the team visited American Hospital Inc. and, for the first time, saw the system the
clinic actually runs. Until now the project had been designed against a description of AHI's
workflow. It is now designed against an observed one, and the two differ enough that several
statements in the PID are no longer true.

The governing goal, stated by the team: **adapt to the clinic's existing architecture** rather
than ask the clinic to adapt to ours.

Everything below is sourced from that visit. Where a fact was observed directly it is marked as
such; where it was reported by staff it is attributed; where it remains unknown it is listed in
§8 rather than guessed at.

---

## 2. What the clinic actually runs

**A Microsoft Access front-end against a SQL Server database, on a wired in-house LAN.**

Access is the application the staff use. It is not the database — the tables live on a server in
a rack inside the clinic, reached over wired ethernet. Reception staff described it as "in-house
lang, server," confirmed there is no cloud component ("wala siyang online. Dito lang talaga sa
clinic"), and the database engine was read off the management console as SQL Server. The version
and edition were not captured and remain unknown.

The program was written around 2000 by an outsourced developer, is no longer actively maintained,
and is supported remotely and informally — problems are escalated by phone or Messenger to a
developer who now has other full-time work. Nobody on site administers the database.

**Only two stations enter data.** Reception handles patient admission and case creation.
Releasing (referred to on site as "typing") produces certificates. Every other department uses
the system only to print. This was stated plainly and repeated: "Print na lang. Puro print na
lang," and "Ang nag-i-input lang naman sir, sa amin tsaka sa releasing."

**There is no role-based access control.** Every account observed was an administrator.

**Packages are structured per agency.** A medical type is registered against a company, and each
medical type contains a set of tests — lab, urinalysis, stool, drug test, HIV and others — drawn
from a master test list. Per-patient additional tests can be added, edited or deleted. Client
requirements arrive by email as quotations and are keyed in by hand. Roughly 30 companies are
currently active; older entries exist but are stale and unmaintained.

**Results leave the clinic on paper and in a spreadsheet.** Patients receive paper, and are
emailed only when they ask. Agencies receive a manually maintained Excel file per company listing
patient name, date of medical, pending items, and fit/unfit. Releasing staff maintain it by hand
and offered to share the template.

**Patient identity resets monthly.** The current transaction number is a year-month prefix plus a
sequence that restarts at zero each month. Staff raised this as a problem unprompted and asked
for a single persistent identifier per patient. A previous online system used date of birth plus
transaction number as credentials.

**Barcoding has been requested before and never delivered.** Staff want barcodes on blood tubes so
the laboratory analyzer can read patient information instead of having it typed. A previous
developer promised this and did not deliver. An idle printer is available. Changing the system
would require coordinating with the analyzer's supplier.

**The workstations are old and slow.** Observed directly and remarked on repeatedly.

---

## 3. What this changes in the PID

`memory-bank/pid.md` contains four statements that the visit falsified and one that is now
unmeasurable. These are amended in the same change as this document.

**`pid.md:23` — "Departmental staff will encode PEME-specific findings directly into the new
system."** No department has ever encoded anything. This is not a digitisation of existing
behaviour; it is a new behaviour the system would introduce. Whether departments will adopt it is
genuinely open (§8), and it must be described as a proposed change rather than an existing
practice.

**`pid.md:32` — "read-only API endpoints to cross-reference … the existing legacy Clinical
Information System."** There is no API. There is an Access application over a LAN. The
integration surface described here does not exist and never did.

**`pid.md:36` — "The system will NOT replace the broader hospital information system."** The team
has decided to target full replacement of the Access program, with billing as a possible
exception (§8). This line is reversed in intent, though not within the capstone scope (§6).

**`pid.md:16` and `pid.md:57` — "Cloud-Native Deployment" as a formal objective.** The system will
be deployed on premises (§4). Self-hosted Supabase in Docker remains containerised and
cloud-portable, and `pid.md:61` already sanctions on-premise hosting as a fallback, but the
objective's wording must change. **This requires the capstone adviser's agreement before it is
rewritten**, since it is a stated research objective and not merely an implementation note.

**`pid.md:44-48` — the operational KPIs. Retained, with the measurement method changed.** There
will be no live patient throughput before 21 November, so these are measured by **controlled PEME
cycle simulation** instead: role-play runs with clinic personnel against a representative dataset,
against a baseline measured from the existing Access workflow with the same staff and case mix.
They remain genuine non-functional requirements with numbers behind them rather than being demoted
to design targets. Criteria in §7; write-up rules in §6.

---

## 4. Design — deployment topology

**One Docker host inside the clinic runs both the database and the application.**

Self-hosted Supabase and the Next.js application run on a single machine on the clinic LAN. Staff
workstations reach it over wired ethernet with no internet in the request path. The patient and
agency portals reach the *same* application through an outbound-only tunnel, so no inbound port
is opened on the clinic firewall.

There is one database and one source of truth. No synchronisation code is written, and there is
no second system to disagree with.

### Why Supabase rather than plain Postgres or their SQL Server

The application is coupled to Supabase, not merely to Postgres. It uses
`supabase.auth.signInWithPassword`, `getUser`, `onAuthStateChange` and `resetPasswordForEmail`;
one Realtime channel; Storage; and RLS policies written against `auth.uid()`. Nine files import
`@supabase/*`, so the surface is small and well contained — but replacing the platform means
rewriting authentication, row-level authorisation and realtime from scratch.

Pointing the application at the clinic's SQL Server would mean exactly that rewrite, plus adding
a case lifecycle, department visits, DPA gating flags and an audit log to the live production
database that the entire clinic depends on daily and that nobody on site can administer. That is
the highest-risk option available and it is rejected.

Self-hosting Supabase preserves the existing build. The application changes by two environment
variables. Studio, the Logflare analytics stack and imgproxy are dropped from the compose file;
they are unused here and are the memory-hungry components.

### Why on-premise rather than cloud

The failure mode inverts correctly. If the clinic's internet drops, the portals become
temporarily unreachable for agencies and patients while **the clinic keeps working at full
speed**. A cloud deployment gives the opposite: the line drops and Reception stops admitting
patients. For a clinic with no current internet dependency at all, that is not an acceptable
regression.

It also moves compute off the old workstations. Today the Access front-end executes on each PC,
which is why staff describe the system as slow. In the new architecture those machines run a
browser and nothing else.

Finally, it produces the System Installer and Installation Guide that the capstone requires as
final deliverables. A `docker-compose` stack has a natural installer; a hosted deployment does
not.

### Consequences accepted

Backups, uptime, TLS renewal and OS patching become the team's responsibility, with no vendor
support behind them. The Singapore Supabase project rebuilt on 2026-08-27 (`decisions.md`)
becomes the staging and development environment rather than production — and the migration-history
repair done in that same work is what makes a fresh self-hosted instance reproducible at all, since
all 48 migrations now apply cleanly from empty.

### Deferred sub-decision

How the tunnel terminates TLS is **not** decided here. A Cloudflare Tunnel is free and simple but
decrypts at Cloudflare's edge, which is a real question for medical data under RA 10173 given that
AHI publishes a Data Privacy Officer. Tailscale Funnel and a VPS reverse proxy over WireGuard are
the alternatives. This is a decision for the clinic's DPO and does not block anything above.

### Hardware

Not decided, and deliberately absent from the written proposal to the clinic; to be raised in
conversation instead. A team laptop is sufficient for development and for October's UAT. It is
not a production host — it sleeps, has no disk redundancy, and leaves the building each day.
Production hardware is a post-capstone decision.

The clinic's own server specifications are unknown (§8). Note that the current workload — roughly
50 patients a day with two data-entry stations — is very light, and the fact that it runs well
today implies nothing about capacity to host this stack.

---

## 5. Design — identity, and the reception slip

**Each patient receives a permanent identifier that never resets.** This directly answers the
complaint raised on site: the present transaction number restarts at zero every month, so it
cannot identify a returning patient.

`patient` (`memory-bank/database/schema.txt:60`) currently has only a UUID primary key and a
unique `governmentid`. A human-readable, monotonic patient number is a new column and a new
migration.

**Authentication is patient number plus password.** No email is required and no SMTP is deployed,
which removes an entire service from the self-hosted stack. The cost is that password resets
become a Reception desk task rather than self-service, which is acceptable for a clinic where
patients are physically present at registration.

Date of birth as a credential — as the clinic's previous online system used — is rejected. It is
not a secret, and this is medical data under RA 10173.

**Reception prints a slip for the patient**, as it does today. The slip carries the permanent
patient number rendered as a barcode. Rendering a barcode costs nothing and requires no hardware;
it makes the slip forward-compatible with the deferred scanner work.

Tube labelling should carry the **case number**, not the patient number, since a returning patient
has several medicals and a specimen belongs to exactly one of them. Both the scanner hardware and
the laboratory analyzer integration are out of scope (§6).

---

## 6. Capstone scope

> **REVISED 2026-09-03.** An earlier draft of this section sized the scope *down* to protect the
> IT132DL 70%-completion figure. That optimised against the wrong risk. The faculty adviser's
> standing guidance is that a capstone must make an operational difference and handle at least two
> datasets, and that the live danger at a defence is a panel judging the scope **too small**. The
> reasoning below replaces the earlier version.

**Binding date: Saturday, 21 November 2026** — with the completed system and manuscript due a week
prior, **14 November**, roughly ten weeks from this revision.

**Course: IT141DL — Capstone 2, the final defence phase.** Confirmed 2026-09-03. Panel verdicts are
live, including **Redefense**, and the full final deliverable set is due: completed system and
manuscript by 14 November; a **client acceptance letter signed by AHI** for the appendix; three
book-bound copies with signed approval pages; three MicroSDs carrying the manuscript, source code,
**Installation Guide** and **System Installer**; a publication; and at least an hour of Q&A.

Two notes. The **client acceptance letter** needs the executive's signature; the team reports
(2026-09-03) that it is readily obtainable, so it is not treated as a critical-path risk — but it
remains entangled with the fee and IP question in §10, which should be cleared with the CPAR
Coordinator before anything is signed. And the on-premise topology in §4 is what makes "System
Installer" and "Installation Guide" producible at all; a hosted deployment would have left both
awkward to satisfy.

### Sizing the scope

Two constraints pull against each other, and both are real.

A panel may return **Redefense** where "the system does not solve the problem stated in the
manuscript" — which punishes a scope statement broader than what was built. The adviser warns
against a scope judged **too small** — which punishes trimming. The resolution is neither: state a
scope that is *broad in coverage* and *complete in delivery*, and separate what the system **does**
from what the clinic has **adopted**.

The clinic will not have adopted the system by 14 November. That is accepted and is not a defect.
Adoption is not the claim being defended; capability is.

**KPI measurement — what is actually done.** The team runs full PEME cycles with clinic personnel
against a prepared dataset, timed end to end, plus a baseline of the same case shapes through the
existing Access workflow with the same staff. This is a material upgrade on the earlier plan in
this document: full-cycle runs produce a cumulative processing-time figure, so the `pid.md:44-48`
KPIs survive as non-functional requirements with numbers behind them rather than being demoted to
design targets.

Nothing in the UA&P guidelines requires evaluation against a live production environment — they
name ISO 25010, CES, TAM, OWASP ZAP and black/white box testing, all ordinarily conducted under
controlled conditions.

**Manuscript presentation is directed by the program head**, who is actively involved in the
write-up. This document does not prescribe manuscript wording, voice, or what is or is not
described in the methodology chapter. What it does fix is the internal record: §7 states what is
measured and under what conditions, so the results are reproducible by the team and by anyone
picking the work up later.

**The two entity domains** are satisfied within the system as designed, per the adviser's reading:
the clinical domain (cases, department visits, results, decisions) and the
commercial/administrative domain (companies, agency-scoped packages and medical types, waivers,
portal access). Legacy migration is therefore *not* load-bearing for that criterion, which is why
§6 asks only for a representative migration rather than a full one.

**The operational-difference claim** cannot rest on live patient throughput, since there will be
none. It rests instead on the change the clinic's own executive asked for: eliminating the manual
re-typing at Releasing. Today Releasing types certificates by hand and maintains the agency Excel
file by hand. The system produces both automatically. That is demonstrable at a defence, and it is
measurable by the timed task comparison in §7 — the same staff, the same tasks, both systems.

### In scope — must be working by 14 November

A PEME workflow system **adapted to AHI's on-premise architecture**. Everything already built is
retained: the role-scoped dashboards, the case lifecycle, both external portals, realtime and
audit logging. The adaptation work is:

- Re-hosting on the clinic LAN per §4, deployed and demonstrable — not described.
- Restructuring reference data to match AHI's real company → medical type → test hierarchy.
- Permanent patient number, and patient-number-plus-password authentication per §5.
- A printed reception slip.
- An Excel export matching the format Releasing already sends to agencies, generated rather than
  hand-maintained. **This carries the operational-difference claim** alongside automated
  certificate production — both replace manual re-typing the executive asked to eliminate.
- A **representative** migration of clinic data: reference tables in full, plus a sample of
  historical records sufficient to demonstrate the capability. Not a full patient-database
  migration, which needs approvals and a cutover this timeline cannot absorb.
- UAT with clinic employees on a representative dataset, plus the KPI simulation runs and their
  Access baseline (§7).
- Chapter 4 updated so that the manuscript and the system describe the same thing.

### Stated in the manuscript as future work

Full retirement of the Access program; billing; migration of the complete patient history; tube
barcoding and the laboratory analyzer integration; and cutover to live patients. These are
described as a deployment roadmap with the clinic, not as capability the system lacks.

### The October evaluation

UAT with clinic employees on a representative dataset, plus the KPI simulation runs. No live
patients, and therefore no cutover risk and no dependency on the analyzer supplier. Building the
dataset requires the clinic's **reference data** — package
definitions, medical types per agency, test lists and company names — which contains no patient
data and is a far easier approval than the patient database.

**Adoption is not the claim.** The manuscript defends capability, correctness and measured
task-level improvement, and presents rollout as a roadmap agreed with AHI. Claiming operational
adoption that did not happen would invite exactly the "system and manuscript are significantly
different" finding that §10 warns about — the risk runs toward over-claiming, never toward
under-claiming.

---

## 7. Acceptance criteria

Written before the work, per `.claude/rules/verification.md`. Each is stated as an observable
behaviour, and each names what must **not** happen.

**Permanent patient number**
- A patient registered in one month and again in a following month resolves to the same patient
  number. The number must not change, and must not be reused for a different patient.
- The number is unique across the table; concurrent registrations must not produce a collision.
- Registration fails loudly rather than silently assigning a duplicate.
- The existing `patientid` UUID remains the foreign key everywhere; the patient number must not
  become a join key.

**Authentication by patient number**
- A patient signs in with patient number and password and lands on `/dashboard/patient`.
- A patient number that exists with a wrong password is rejected with the same message and timing
  as one that does not exist — enumeration must not be possible.
- No email is required at registration, and no outbound mail is attempted on any auth path.
- Existing role routing (`lib/supabase/role-routing.ts`, `roles.ts`, `lib/supabase/middleware.ts`)
  is unchanged; no role gains access to a route it could not reach before.

**Company-scoped packages**
- A medical type belonging to company A is not offered when registering a case for company B.
- A case cannot be created against a package that is not linked to its company.
- Per-patient additional tests remain addable, editable and removable; the package fence rule in
  `decisions.md` (required tests cannot be removed, off-package extras always allowed) must not
  regress.

**Excel export**
- The export contains exactly the columns the clinic's current file contains, for the same case
  set, and opens in Excel without a repair prompt.
- Cases that are not released, or whose `waiversigned` is false, must not appear in an export
  destined for an agency.

**Deployment**
- All 48 migrations apply cleanly to an empty self-hosted instance, producing a schema identical
  to staging.
- With the host's internet disconnected, a staff workstation on the LAN can still register a
  patient, and the case appears in the relevant queue.
- With internet restored, the portals serve the same data from the same database.

**KPI measurement**
- Full PEME cycles are run with clinic personnel against a prepared dataset and timed end to end,
  producing a cumulative processing-time figure.
- **The baseline already exists** — the `pid.md:44-48` figures come from the team's own prior
  measurement of the Access workflow, recorded in Chapters 1–3. It is not re-measured. The "after"
  runs should mirror whatever instrument produced those originals (records review, timed
  observation, staff logs — whichever it was), so both halves of the comparison come from the same
  method rather than two different ones.
- Expected values are never derived by running the system first. Targets come from the
  requirement; the runs report what actually happened, including when a target is missed.
- Run counts, participant counts and case mix are recorded in the repo, so the figures are
  reproducible rather than anecdotal.

---

## 8. Open — to close on site

**Onsite cadence (2026-09-03).** Every Wednesday is fixed; Monday or Thursday next week is likely;
Saturdays are possible but not this coming one. **Ms. Susie must be told of each planned arrival in
advance.** The clinic has offered working space and the executive her room, so visits are frequent
rather than rare — but frequency is not the same as no planning. Each session should go in with a
list of what to observe and what to collect, because staff attention is the scarce resource, not
building access.

**Artefacts to collect**, distinct from the questions below: the Access program files; a schema
script and reference-table export from the current database; **a real copy of the agency Excel
sheet** (it settles `Q-11`); the reception slip; and the certificate template for `Q-09`.

These are unknown, not assumed. Nothing above depends on a guessed answer.

**Department processes.** What each department prints and at what moment; whether the printout is
a worklist, a request slip or a blank result form; where a result physically goes after the test;
who types it and from what; whether the analyzer prints its own output. Critically: **how does a
department know a patient is coming?** If the answer is "the patient walks up holding paper," then
departments have no queue today and the queue view is a new behaviour, not a digitisation — which
decides whether one-tap status is a small ask or a change-management problem.

**Hardware and software.** `SELECT @@VERSION` on the management console gives the SQL Server
version and edition; Express would imply a 10 GB ceiling and confirm the data volume is small.
Server model, OS and RAM. And on two or three actual workstations: OS, browser and browser
version — a machine too old for a modern browser is the single hardware risk that could sink
October, and no amount of server capacity fixes it.

**Billing.** Nobody has seen the module; it was raised on site and deflected. Look, do not touch.
Note that building billing would carry BIR accreditation exposure for official receipts, on top of
`pid.md:35` already excluding financial processing.

**Non-PEME share.** What proportion of the Access program's work is not pre-employment medicals.
This sizes any eventual replacement. Note that the transaction sequence had reached roughly 140 by
2 September, which is higher than PEME volume alone would suggest.

**Artefacts to request**, in ascending order of approval difficulty: screenshots of each Access
screen, for interface familiarity; a schema script plus a CSV export of the reference tables, which
is what UAT seeding actually needs and contains no patient data; and only much later, the `.accdb`
and a SQL Server backup. This machine has `Microsoft.ACE.OLEDB.16.0` and the Access ODBC driver
installed, so an `.accdb` can be read directly when one is eventually obtained.

---

## 9. Questionnaire status — `2026-08-16-staff-workflow-revision-design.md` §5

The visit advanced seven of the fourteen blocking questions. **Q-11's default is contradicted and
should be changed.**

| # | Status after 2026-09-02 |
|---|---|
| **Q-01** | **Answered.** Reception hands the patient a printed slip today. Barcode is not merely acceptable but actively wanted. Default confirmed and strengthened. |
| **Q-02** | Unanswered. |
| **Q-03** | **Partial.** Every account observed was an administrator, so the current system has no role separation. Whether accounts are *shared per station* is still unconfirmed. |
| **Q-04** | Unanswered. |
| **Q-05** | Unanswered — billing not observed. Staff framing treats billing as separate, which leans toward the "no gate" default. |
| **Q-06** | **Answered.** Medical types are registered per agency and contain a test set; per-patient additional tests can be added, edited and deleted. Confirms the hybrid package-fence rule in `decisions.md` matches practice. |
| **Q-07** | Unanswered. |
| **Q-08** | Unanswered. |
| **Q-09** | **Path opened.** Releasing produces certificates; staff offered to supply forms and templates via Viber subject to approval. Template still not received. |
| **Q-10** | Unanswered. |
| **Q-11** | **Default contradicted, and the evidence conflicts.** The transcript has Ian listing the agency Excel's columns as company, patient name, date of medical, "'yung mga pending", and fit/unfit — implying agencies already see in-progress status, which would make the "released only" default a **downgrade** on today's service. He has since described the same file as the *completed* list of employee PEMEs. Both can be true of a per-company batch sheet, but they imply different portal designs. **Collect one real sheet; it settles the question.** Then weigh against the DPA gating in `pid.md:27`. |
| **Q-12** | **Partial.** Roughly 50 patients a day. Workstations per department still uncounted. |
| **Q-13** | **Partial.** Wired LAN, no internet dependency, old and slow workstations. Browser versions still unknown — see §8. |
| **Q-14** | Unanswered. |

---

## 10. Risks

**Manuscript–system divergence.** The final defence in IT141DL can return a Redefense verdict when
"the system and the manuscript are completely or significantly different from each other," or when
"the system does not solve the problem stated in the manuscript." The divergence is already
concrete: `docs/chapter-4-figures/` contains 50 screenshots of the system as documented, including
`figure-4-21-dept-encoding-form.jpg` and `figure-4-23-dept-required-tests.jpg` — departmental
encoding that no department has ever performed.

**Revised 2026-09-03: this is now a live risk, not a future one.** With a defence on 21 November
and the manuscript due 14 November, the Chapter 4 correction is on the critical path rather than
being a tidy-up for next term. It is still a small edit — but only while it is made deliberately,
rather than discovered by a panelist.

**~~Intellectual property versus the commercial arrangement.~~ RESOLVED 2026-09-03.** The program
head confirmed the split: the manuscript and the code instance frozen at completion belong to the
university; the running program stays with the students and may be arranged with the client at
their discretion. The fee arrangement and the post-capstone continuation are both clear to
proceed. Recorded in `decisions.md`.

**Task board compliance — downgraded 2026-09-03.** The task-board-with-tickets requirement and the
prohibition on deleting unresolved tickets belong to **IT132DL**, which the team has already
completed. In IT141DL the adviser's listed activities include an optional code review via repository
access. So the 2026-08-22 deferral of GitHub Issues is not a live compliance breach, as an earlier
draft of this document implied. It remains worth confirming that the adviser can reach the
repository, since the guidelines place the onus on students to initiate contact.

**Evaluation metrics.** The guidelines name ISO 25010, Customer Effort Score and the Technology
Acceptance Model; `pid.md:17` names FURPS+ and SUS ≥ 68. FURPS appears in both, so it is safe; SUS
does not appear while CES does. This matters at the defence rather than as a course deliverable:
the execution rubric assesses "functional completeness and appropriateness, usability, reliability,
performance, and security" — which is ISO 25010's vocabulary, so the results chapter should speak
it. `npm run qa:security` already runs the OWASP ZAP baseline the guidelines call for.

**Adviser access.** The guidelines require the faculty adviser to have access to the SCM and the
task board, and place the onus on students to initiate contact. Unverified whether this is in place.

**Scope creep against a fixed date.** The ambition expanded materially during this visit while the
deadline did not move. §6 is the mitigation: the roadmap absorbs the ambition, the scope statement
stays deliverable.

---

## 10a. Timeline to 21 November

Ten weeks to the 14 November freeze. The sequence below is ordered by what blocks what, not by
size. Dates are targets, not commitments — the implementation plan supersedes this.

| When | What | Blocks |
|---|---|---|
| Week of 2026-09-07 (Mon/Thu likely, Wed fixed) | First onsite sessions. Collect the artefacts in §8 — Access program files, schema script and reference-table export, a real agency Excel sheet, the reception slip, the certificate template. Observe department processes. Run the version and browser checks. | The Excel export, the reception slip, `Q-09`, `Q-11`, and the reference-data restructuring |
| Week of 2026-09-07 | Adviser conversation: the `pid.md` Objective 2 rewording and the metrics set (ISO 25010 / CES vs FURPS+ / SUS). IP is already resolved. | The manuscript framing |
| Week of 2026-09-07 | Confirm the client acceptance letter's wording and timing with the executive. Reported readily obtainable. | The appendix |
| September | Publication route chosen — conference, journal, or IST colloquium. Fees are the students'. | A required completion condition, independent of the system |
| September | **Permanent patient number + auth change.** Depends on nothing and nobody; start immediately. | UAT, the reception slip |
| September | Company ↔ package relation — schema and UI are ours; the hierarchy shape needs their tables. | UAT dataset |
| September–October | On-premise deployment: trimmed self-hosted Supabase, all 48 migrations from empty, tunnel, LAN verification from a clinic workstation. **Largest unknown in the plan — start early, not late.** | UAT on real hardware |
| October | Excel export and automated certificate production. | The operational-difference claim |
| October | Reception slip. | UAT |
| October | UAT with clinic employees; full PEME cycle runs timed end to end. Baseline is the team's existing Chapters 1–3 measurement — not re-measured. | Results chapter |
| Late October | Representative migration of clinic data. | The data-handling narrative |
| November | Chapter 4 correction, manuscript, client acceptance letter, MicroSDs, book-bound copies. | 14 November freeze |

**Revised 2026-09-03.** Nothing on this list is now waiting on someone outside the team. The IP
question is resolved; the clinic is visited weekly at minimum with working space provided; the
acceptance letter is reported straightforward. Frequency is not the same as no planning, though —
staff attention is the scarce resource, so each session goes in with a list.

---

## 11. Next steps

Development pauses here (2026-09-03) with the design settled and the decisions recorded. When it
resumes:

1. **Onsite session plan** — a per-visit list of what to observe and what to collect, so the weekly
   visits produce artefacts rather than conversations. Ms. Susie needs advance notice of each
   arrival.
2. **Build the patient-number slice** — permanent patient number, migration, and the switch from
   email to patient-number authentication. Depends on nothing; can run in parallel with everything.
3. **Start the on-premise deployment** — the largest unknown in the ten weeks. Early failure here
   is recoverable; late failure is not.
4. Adviser conversation: `pid.md:16` objective rewording and the metrics set.
5. Written proposal to the executive — scope, deadline, fee. IP is cleared, so this can proceed.
   Hardware raised in conversation, not in the document.
6. Proposal presentation to executives and department heads.
7. `Q-11` decided once a real agency Excel sheet is in hand.

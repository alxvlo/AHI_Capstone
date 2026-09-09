# Department reconciliation — clinic stations vs our reference data

**Date:** 2026-09-09
**Status:** ANALYSIS ONLY. No migration written. Confirm against the clinic's own tables before changing anything.
**Evidence:** the clinic's Pre-Employment Medical Examination Monitoring Form (form code `AHI.com-002-Rev.0 -5/2011`), read alongside the local database at 50 migrations.

> The monitoring form itself is a clinic artefact carrying patient data and is **not** in this
> repository. Only the station names — which are not patient data — are recorded here.

---

## The finding

The clinic's monitoring form lists **16 stations**. A patient physically walks to each one and
collects a signature, a time in, and a time out. Our `department` table seeds **10 rows**.

Six of the clinic's stations do not exist in our data, and one of ours merges two of theirs.

The consequence is already visible in the seed data: **47 of 58 tests are filed under
Laboratory**, not because they are laboratory tests but because Laboratory was the only
plausible bucket for tests whose real station we never created.

---

## Station-by-station

| # | Form station | Our `department` | Verdict |
|---|---|---|---|
| 1 | BILLING | `BILLING` "Billing/Cashier" | **Merged** — the form treats Billing and Cashier as two separate stops |
| 2 | I-CLINICALAB | — | **Missing.** Unidentified. Must ask. |
| 3 | ELECTRONIC PHOTO | — | **Missing** |
| 4 | CASHIER | folded into `BILLING` | **Merged** — see 1 |
| 5 | LABORATORY | `LAB` | Maps |
| 6 | DAAT | — | **Missing** |
| 7 | RADIOLOGY | `XRAY` "Radiology (X-Ray)" | Maps |
| 8 | ULTRASOUND | `UTZ` | Maps |
| 9 | OPD | — | **Missing** |
| 10 | ECG | `ECG` | Maps |
| 11 | VISUAL TEST | — | **Missing** |
| 12 | AUDIOGRAM | `AUD` "Audiometry" | Maps |
| 13 | PFT | `PFT` | Maps |
| 14 | DENTAL | `DENTAL` | Maps |
| 15 | PHYSICAL EXAM | `PHYS_EXAM` | Maps |
| 16 | PSYCHOLOGY | — | **Missing** |
| — | *(not on the form)* | `RECEPTION` | Ours only. Defensible: the form's header block *is* admission. |

Nine map cleanly. One is merged. Six are missing.

---

## How confident we are, per missing station

Confidence comes from whether the test catalogue already contains tests that clearly belong
somewhere else. The `category` column turns out to know things the `departmentid` does not.

### DAAT — **strong evidence**

`test_catalog` already has two rows with `category = 'Drug Test'`:

- Methamphetamine
- Tetrahydrocannabinol

Both sit under `LAB`. DAAT reads as Drug and Alcohol Abuse Testing, and the clinic's own words on
2 September were *"Eto 'yung test: drug test, stool, HIV, ganyan."* The category column already
separates them; only the department assignment is wrong.

**Proposal:** create `DAAT`, move those two tests to it.

### PSYCHOLOGY — **strong evidence**

`test_catalog` has two rows with `category = 'Psychometric'`:

- Personality Test
- Intelligence Test

Both sit under `PHYS_EXAM`. They are psychological assessments filed under Physical Examination
because Psychology does not exist.

**Proposal:** create `PSYCHOLOGY`, move those two tests to it.

### VISUAL TEST — **medium evidence, and a second gap**

A station on the form, but **no test in the catalogue corresponds to it**. So this is two gaps:
a missing department *and* a missing test. Nothing currently records a patient's vision.

**Proposal:** create `VISUAL_TEST`, and add at least one test to it. What that test should record
— acuity, colour vision, both — needs asking.

### Billing / Cashier split — **medium evidence**

The form lists them as two consecutive stops, which implies the patient goes to one and then the
other. Our single `Billing/Cashier` row cannot represent that, and neither row currently has any
test attached.

**Proposal:** split into `BILLING` and `CASHIER`. Confirm they really are two stops and not one
desk written twice.

### ELECTRONIC PHOTO — **medium evidence**

Plainly a station: the patient is photographed for their record or certificate. It produces no
measurable result, so it would be a visit with no result items — which our schema permits.

**Open question:** does the photo need storing? If so it is a `result_file`, not a `result_item`,
and that has RLS and retention consequences.

### OPD — **genuinely ambiguous, do not guess**

Out-Patient Department, most likely the physician consultation. But our system does **not** model
the physician as a department visit — it models a decision (`peme_decision`) taken after all
visits complete.

Creating an `OPD` department could therefore either be correct, or duplicate the decision step and
produce cases that can never complete. This one needs their table structure before anyone acts.

### I-CLINICALAB — **unknown**

Could be a vendor or system name, a satellite laboratory, or a specific panel. Nothing in our data
or the transcripts explains it.

**Must ask.** Do not invent a mapping.

---

## What changes if we act

Five tables carry foreign keys into `department`: `department_visit`, `result_item`,
`result_file`, `package_department`, `test_catalog`.

**Test moves.** Four tests change department — two to DAAT, two to PSYCHOLOGY. No test is created
or deleted, so the catalogue stays at 58 unless a vision test is added.

**Package mappings.** All five packages currently route through the ten existing departments:

| Package | Departments today |
|---|---|
| Basic PEME (Local) | RECEPTION, BILLING, LAB, XRAY, PHYS_EXAM |
| Comprehensive Seafarer | RECEPTION, BILLING, LAB, XRAY, ECG, PFT, AUD, DENTAL, PHYS_EXAM |
| Demo Lab Only | LAB |
| Food Handler Package | RECEPTION, BILLING, LAB, PHYS_EXAM |
| QA Mini Package (3-test) | LAB, XRAY |

Any package containing a drug test must gain `DAAT`; any containing a psychometric test must gain
`PSYCHOLOGY`. Otherwise a case would carry a test whose station it never visits. The 21 mapping
rows will grow.

**The census check will fail, and that is correct.** `scripts/supabase/verify-local-stack.mjs`
asserts `department: 10`. Changing the department list breaks it immediately, which is the census
doing its job — the expected count gets updated deliberately, as part of the change, rather than
drifting unnoticed.

**Existing cases.** On a local stack, none. On any environment with real `department_visit` rows,
moving a test between departments does not orphan a visit, but it does mean historical visits and
current package definitions disagree. Worth checking before touching a populated environment.

---

## Why this is not a migration yet

The form's column header reads "Department Names", which argues all sixteen are stations. But the
2 September transcript lists drug test, stool and HIV as **tests inside a medical type**, which
argues some are line items. Both readings are defensible, and DAAT could easily be a station at
which the drug test is performed.

Three of the six — OPD, I-CLINICALAB and ELECTRONIC PHOTO — cannot be settled from a photograph
at all.

Adding a department later is cheap. Removing one after cases have generated visits against it is
not. `.claude/rules/verification.md` requires expected values to come from the requirement or the
schema rather than inference, and the clinic's own tables are the requirement here.

**A migration written from a photograph is a guess wearing a migration's clothes.**

---

## What settles it

The Saturday database pull. Their SQL Server tables will show whether these sixteen are rows in a
department table or line items in a test table, and what `I-CLINICALAB` actually is.

Questions to carry:

1. What is `I-CLINICALAB`?
2. Is `OPD` the doctor's consultation, and is it a station a patient queues at?
3. Are Billing and Cashier two separate stops, or one desk?
4. What does `VISUAL TEST` record — acuity, colour vision, both?
5. Does `ELECTRONIC PHOTO` produce a stored image, and does it go on the certificate?
6. Does every patient pass all sixteen, or does the medical type decide which apply?

Question 6 matters most for the queue display they asked for: a queue must know which stations a
given patient still owes.

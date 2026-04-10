# AHI Client Answers — March 21, 2026

**Source:** `ahi-questions-march21.pdf`
**Status:** Section 1 answered; Sections 2–4 pending AHI response

---

## Section 1: Access & Result Recipient (✅ ANSWERED)

| Question | AHI Answer | System Impact |
|---|---|---|
| Who is the primary recipient of results? | **Both** — Patient portal (detailed results) and Company portal (FIT/UNFIT only) | Two distinct portal views with different data depth |
| Is there a hierarchy? | **Yes** — Company sees summary only, Patient sees full results | RLS policies must filter `result_item` visibility by role |
| Does test type affect who gets results? | Company sees **progress + overall results only**. Patient sees **status of results + uploaded results** | Company portal: no `result_item` detail, only `peme_decision.fitnessstatus`. Patient portal: show per-department completion + result files |
| Can company restrict patient access? | **No** — Patient access is always guaranteed | Patient portal shows results regardless of company settings |
| Consent mechanism? | **Physical waiver form signed in-person** — gives authority to share | Maps to existing `waiverSigned` boolean on `peme_case`. Reception must verify at case creation |
| Company-side designated person? | **Crewing officer** (screens applicants internally) | Company account = crewing officer role. Label as "Crewing Officer" in UI |
| Multiple people per company? | **One account per company** (safer) | No multi-user company accounts. Single login per agency |

### Key Design Implications

1. **Patient Portal** must show:
   - Case progress timeline (per department completion status)
   - Uploaded result files (new feature: file/image upload capability)
   - Fitness status (FIT/UNFIT) when released
   - Full result detail (privacy-approved fields)

2. **Company/Agency Portal** must show:
   - **Only FIT or UNFIT label** — no clinical details
   - Progress status of their applicants (which stage)
   - Consent-gated: blocked unless `waiverSigned = true`
   - One login per company (crewing officer)

3. **Result Upload Feature** (NEW requirement from AHI):
   - Staff need ability to upload result files (images, PDFs) per department visit
   - Patient should be able to see/download these uploaded results
   - This requires Supabase Storage integration

---

## Section 2: File Format & Result Types (❌ NOT YET ANSWERED)

Questions pending:
- What result types does the clinic release?
- Current file formats used?
- Any editable documents (.docx)?
- X-ray/imaging format (DICOM, JPG/PNG, printed)?
- Company-specific format preferences?
- Standardized template per result type?

**Blocker for:** PDF template design, result display format

---

## Section 3: Template & Sample Requests (❌ NOT YET ANSWERED)

Questions pending:
- Sample/template files for each result type
- Company-specific templates?
- Branding (clinic logo, company logo, both)?
- Doctor's digital signature / PRC license required?
- Draft vs. finalized result state?
- Package-to-exam mapping list

**Blocker for:** PDF generation, result encoding form fields

---

## Section 4: Patient/Client Onboarding (❌ NOT YET ANSWERED)

Questions pending:
- Current list of client companies
- How does a patient sign up?
- Required information fields for patient and company accounts

**Blocker for:** Registration form field validation, company seed data

---

## Action Items

1. ✅ Update Patient Portal design to show result files and detailed status
2. ✅ Update Company Portal design to show ONLY FIT/UNFIT (no clinical detail)
3. ✅ Add result file upload feature to Department Staff module
4. ✅ Label company account holder as "Crewing Officer" in UI
5. ✅ Enforce one-account-per-company constraint
6. ⏳ Follow up with AHI for Sections 2–4 answers
7. ⏳ Request package-to-exam mapping data from AHI

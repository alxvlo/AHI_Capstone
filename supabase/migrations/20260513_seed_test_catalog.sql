-- supabase/migrations/20260513_seed_test_catalog.sql
-- Seeds test_catalog with AHI's actual reference panel from Operations.pdf
-- (Document B.2 EQUIPMENT — Laboratory).
-- Idempotent: uses ON CONFLICT to skip duplicates if reapplied.
-- Department code corrections vs. original plan:
--   ULTRASOUND → UTZ, AUDIOMETRY → AUD, PSYCH → PHYS_EXAM (Physical Examination)

with d as (
  select departmentid, code from public.department
)
insert into public.test_catalog
  (departmentid, testname, category, valuetype, defaultunit, defaultref,
   refmin, refmax, refmin_male, refmax_male, refmin_female, refmax_female, validvalues)
values
  -- LAB / Chemistry
  ((select departmentid from d where code='LAB'), 'FBS',                 'Chemistry',  'numeric',     'mmol/L',  '3.89–6.38',     3.89,  6.38,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Urea Nitrogen',       'Chemistry',  'numeric',     'mmol/L',  '2.5–6.4',       2.5,   6.4,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Creatinine',          'Chemistry',  'numeric',     'µmol/L',  'M:80–115 / F:53–97', null, null, 80,  115, 53,  97, null),
  ((select departmentid from d where code='LAB'), 'SGPT',                'Chemistry',  'numeric',     'U/L',     '≤ 41',          null,  41,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Total Protein',       'Chemistry',  'numeric',     'g/L',     '64–83',         64,    83,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Albumin',             'Chemistry',  'numeric',     'g/L',     '35–50',         35,    50,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'A/G Ratio',           'Chemistry',  'numeric',     'ratio',   '1.5–3.0',       1.5,   3.0,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Alkaline Phosphatase','Chemistry',  'numeric',     'U/L',     'M: ≤116 / F: ≤105', null, null, null, 116, null, 105, null),
  ((select departmentid from d where code='LAB'), 'Phosphorus',          'Chemistry',  'numeric',     'mmol/L',  '0.81–1.55',     0.81,  1.55,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Calcium',             'Chemistry',  'numeric',     'mmol/L',  '2.3–2.6',       2.3,   2.6,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Chloride',            'Chemistry',  'numeric',     'mmol/L',  '98–109',        98,    109,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Cholesterol',         'Chemistry',  'numeric',     'mmol/L',  '< 5.2',         null,  5.2,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'HDL',                 'Chemistry',  'numeric',     'mmol/L',  '0.9–1.95',      0.9,   1.95,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'LDL',                 'Chemistry',  'numeric',     'mmol/L',  '2.65–3.436',    2.65,  3.436, null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'VLDL',                'Chemistry',  'numeric',     'mmol/L',  '0–0.50',        0,     0.50,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'GGT',                 'Chemistry',  'numeric',     'U/L',     'M:11–61 / F:9–39', null,null, 11, 61, 9, 39, null),
  ((select departmentid from d where code='LAB'), 'Sodium',              'Chemistry',  'numeric',     'mmol/L',  '135–155',       135,   155,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Total Bilirubin',     'Chemistry',  'numeric',     'µmol/L',  '2–21',          2,     21,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Direct Bilirubin',    'Chemistry',  'numeric',     'µmol/L',  '1.7–8.5',       1.7,   8.5,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Indirect Bilirubin',  'Chemistry',  'numeric',     'µmol/L',  '1.5–14',        1.5,   14,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Triglycerides',       'Chemistry',  'numeric',     'mmol/L',  '1.695–2.24',    1.695, 2.24,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Iron',                'Chemistry',  'numeric',     'µmol/L',  '9.4–28.4',      9.4,   28.4,  null,null,null,null, null),

  -- LAB / Hematology
  ((select departmentid from d where code='LAB'), 'Hemoglobin',          'Hematology', 'numeric',     'g/L',     'M:140–180 / F:120–160', null, null, 140, 180, 120, 160, null),
  ((select departmentid from d where code='LAB'), 'Hematocrit',          'Hematology', 'numeric',     'ratio',   'M:0.40–0.54 / F:0.37–0.47', null, null, 0.40, 0.54, 0.37, 0.47, null),
  ((select departmentid from d where code='LAB'), 'RBC',                 'Hematology', 'numeric',     '×10¹²',   '4.0–5.4',       4.0,   5.4,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'WBC',                 'Hematology', 'numeric',     '×10⁹',    '5.0–10.0',      5.0,   10.0,  null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'MCV',                 'Hematology', 'numeric',     'fL',      '82–92',         82,    92,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'MCH',                 'Hematology', 'numeric',     'pg',      '27–31',         27,    31,    null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'MCHC',                'Hematology', 'numeric',     'g/L',     '320–360',       320,   360,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Platelets',           'Hematology', 'numeric',     '×10⁹',    '200–400',       200,   400,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Bleeding Time',       'Hematology', 'numeric',     'min',     '1–6 (Cutler)',  1,     6,     null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Clotting Time',       'Hematology', 'numeric',     'min',     '3–5',           3,     5,     null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Blood Type',          'Hematology', 'categorical', null,      'A+/A-/B+/B-/O+/O-/AB+/AB-', null,null,null,null,null,null,
     array['A+','A-','B+','B-','O+','O-','AB+','AB-']),

  -- LAB / Urinalysis
  ((select departmentid from d where code='LAB'), 'Urine Color',         'Urinalysis', 'text',        null,      null,            null,null,null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Urine Transparency',  'Urinalysis', 'text',        null,      null,            null,null,null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Urine pH',            'Urinalysis', 'numeric',     null,      '4.5–8.0',       4.5,   8.0,   null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Urine Specific Gravity','Urinalysis','numeric',    null,      '1.005–1.030',   1.005, 1.030, null,null,null,null, null),
  ((select departmentid from d where code='LAB'), 'Urine Albumin',       'Urinalysis', 'categorical', null,      'Negative/Trace/+/++/+++', null,null,null,null,null,null,
     array['Negative','Trace','+','++','+++']),
  ((select departmentid from d where code='LAB'), 'Urine Sugar',         'Urinalysis', 'categorical', null,      'Negative/Trace/+/++/+++', null,null,null,null,null,null,
     array['Negative','Trace','+','++','+++']),
  ((select departmentid from d where code='LAB'), 'Pregnancy Test',      'Urinalysis', 'categorical', null,      'Negative/Positive', null,null,null,null,null,null,
     array['Negative','Positive']),

  -- LAB / Serology
  ((select departmentid from d where code='LAB'), 'RPR/VDRL',            'Serology',   'categorical', null,      'Non-reactive/Reactive', null,null,null,null,null,null,
     array['Non-reactive','Reactive']),
  ((select departmentid from d where code='LAB'), 'TPHA',                'Serology',   'categorical', null,      'Non-reactive/Reactive', null,null,null,null,null,null,
     array['Non-reactive','Reactive']),
  ((select departmentid from d where code='LAB'), 'HBsAg',               'Serology',   'categorical', null,      'Non-reactive/Reactive', null,null,null,null,null,null,
     array['Non-reactive','Reactive']),
  ((select departmentid from d where code='LAB'), 'Anti-HCV',            'Serology',   'categorical', null,      'Non-reactive/Reactive', null,null,null,null,null,null,
     array['Non-reactive','Reactive']),
  ((select departmentid from d where code='LAB'), 'HIV Screening',       'Serology',   'categorical', null,      'Non-reactive/Reactive', null,null,null,null,null,null,
     array['Non-reactive','Reactive']),

  -- LAB / Drug Test
  ((select departmentid from d where code='LAB'), 'Methamphetamine',     'Drug Test',  'categorical', null,      'Negative/Positive', null,null,null,null,null,null,
     array['Negative','Positive']),
  ((select departmentid from d where code='LAB'), 'Tetrahydrocannabinol','Drug Test',  'categorical', null,      'Negative/Positive', null,null,null,null,null,null,
     array['Negative','Positive']),

  -- XRAY
  ((select departmentid from d where code='XRAY'),'Chest PA',            'Imaging',    'text',        null,      null,            null,null,null,null,null,null, null),
  ((select departmentid from d where code='XRAY'),'Chest Lateral',       'Imaging',    'text',        null,      null,            null,null,null,null,null,null, null),

  -- ECG
  ((select departmentid from d where code='ECG'), '12-lead ECG',         'Cardiology', 'text',        null,      null,            null,null,null,null,null,null, null),

  -- ULTRASOUND (corrected code: UTZ)
  ((select departmentid from d where code='UTZ'), 'Whole Abdomen',       'Imaging',    'text',        null,      'Fasting ≥8h',   null,null,null,null,null,null, null),
  ((select departmentid from d where code='UTZ'), 'KUB',                 'Imaging',    'text',        null,      null,            null,null,null,null,null,null, null),

  -- DENTAL
  ((select departmentid from d where code='DENTAL'),'Oral Examination',  'Examination','text',        null,      null,            null,null,null,null,null,null, null),
  ((select departmentid from d where code='DENTAL'),'Dental Findings',   'Examination','text',        null,      null,            null,null,null,null,null,null, null),

  -- PSYCH/Psychometric (corrected code: PHYS_EXAM — Physical Examination dept)
  ((select departmentid from d where code='PHYS_EXAM'),'Personality Test',  'Psychometric','text',   null,      null,            null,null,null,null,null,null, null),
  ((select departmentid from d where code='PHYS_EXAM'),'Intelligence Test',  'Psychometric','text',  null,      null,            null,null,null,null,null,null, null),

  -- AUDIOMETRY (corrected code: AUD)
  ((select departmentid from d where code='AUD'),  'Audiometry',         'Diagnostic', 'text',        'dB/Hz',   null,            null,null,null,null,null,null, null),

  -- PFT
  ((select departmentid from d where code='PFT'),  'Pulmonary Function Test','Diagnostic','text',     null,      null,            null,null,null,null,null,null, null)

on conflict (departmentid, testname) do nothing;

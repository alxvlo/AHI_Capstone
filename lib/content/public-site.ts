export const publicNavLinks = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
] as const;

export const hospitalProfile = {
  name: "American Hospital Inc.",
  publicName: "American Outpatient Clinic",
  tagline: "Industrial-medicine care for manpower screening and workforce wellness.",
  overview:
    "American Hospital Inc., publicly presented as American Outpatient Clinic, focuses on industrial medicine for land-based and sea-based applicants, annual examinations, and employer-supported diagnostic services.",
  address:
    "2nd Floor FEMII Building, A. Soriano Jr. Avenue, Intramuros, Manila 1002, Philippines",
  phones: ["(632) 8527-1611", "(632) 8527-2853"],
  email: "admin@americanoutpatient.com",
  hours: "Monday-Friday, 8:00 AM-5:00 PM",
  officialWebsite: "https://americanoutpatient.com",
  accreditations: [
    "DOH Accreditation No. 13-010-17-MF-2",
    "ISO 9001:2015 Certified",
    "DMW, DOH, and MARINA-aligned PEME services",
  ],
} as const;

export const aboutHighlights = [
  {
    title: "Focused on industrial medicine",
    description:
      "The clinic centers its public services on pre-employment, annual, and sea-based medical examinations for employers and manpower programs.",
  },
  {
    title: "Built for workforce screening",
    description:
      "Official public materials emphasize medical evaluations that help employers reduce workplace risk and keep screening workflows organized.",
  },
  {
    title: "Employer and shipping-line experience",
    description:
      "The public site highlights long-running service for international firms, shipping lines, and labor-related medical programs.",
  },
  {
    title: "Single-site diagnostics",
    description:
      "The service catalog includes laboratory, radiology, ECG, audiometry, pulmonary testing, drug testing, and other supporting examinations.",
  },
] as const;

export const missionPoints = [
  "Continuously improve systems and medical service delivery.",
  "Communicate clinic requirements clearly with outsourced partners and medical consultants.",
  "Invest in employee growth and operational capability.",
  "Maintain a sustainable, profitable organization.",
] as const;

export const visionStatement =
  "To remain a clinic of choice in industrial and maritime medicine and a trusted provider of pre-employment medical examinations for land-based and sea-based applicants.";

export const historyMilestones = [
  {
    year: "1955",
    title: "Clinic founded",
    description:
      "The official public site traces the clinic's roots to 1955 under Dwight Dill, M.D., with a mission centered on medical screening for working-class applicants.",
  },
  {
    year: "Expansion",
    title: "Broader manpower services",
    description:
      "Public history notes describe expanded services for labor applicants, seafarers, visa-related medical processing, and employer-referred cases.",
  },
  {
    year: "Today",
    title: "Modern industrial medicine workflow",
    description:
      "Current public messaging emphasizes PEME, annual exams, diagnostics, and updated facility capabilities for employer and applicant needs.",
  },
] as const;

export const accreditationHighlights = [
  "Department of Health accreditation",
  "ISO 9001:2015 quality management certification",
  "DMW, DOH, and MARINA standards cited on PEME packages",
  "Publicly listed maritime and international flag or authority recognitions",
] as const;

export const serviceGroups = [
  {
    title: "Pre-Employment Medical Examinations",
    audience: "Land-based applicants and employer hiring programs",
    description:
      "Structured PEME packages designed to assess whether applicants can safely perform job duties while meeting employer and regulatory screening requirements.",
    items: [
      "Medical report and medical history",
      "Complete physical examination",
      "Digital chest X-ray",
      "Complete blood count, urinalysis, and fecalysis",
      "Blood typing, psychological testing, and dental examination",
    ],
  },
  {
    title: "Sea-Based Medical Examinations",
    audience: "Seafarers and shipping-line medical programs",
    description:
      "Sea-based PEME services built around maritime screening requirements, with added tests commonly required for shipboard deployment and fitness review.",
    items: [
      "Audiometric testing",
      "VDRL or RPR and TPHA testing",
      "ESR and other hematology support",
      "MARINA, DOH, and DMW-aligned exam coverage",
      "Packages adapted to duty, age, and risk factors",
    ],
  },
  {
    title: "Annual Examinations",
    audience: "Hotel staff, office personnel, and workforce wellness programs",
    description:
      "Routine medical checkups for individuals or groups to help detect health risks early and support employer wellness compliance.",
    items: [
      "Physical examination and history review",
      "Digital chest X-ray",
      "CBC, urinalysis, and fecalysis",
      "Dental examination",
      "Group-ready annual exam packages",
    ],
  },
  {
    title: "Laboratory Services",
    audience: "PEME packages and standalone diagnostic support",
    description:
      "Laboratory coverage spans clinical chemistry, hematology, immunology and serology, vaccinations, and specimen-based diagnostic testing.",
    items: [
      "Clinical chemistry panels and metabolic markers",
      "CBC, ESR, CRP, PSA, and blood-health tests",
      "Hepatitis, HIV, TPHA, thyroid, and serology support",
      "Vaccination services such as hepatitis, tetanus, typhoid, and cholera",
      "On-site specimen collection for blood, urine, stool, and swabs",
    ],
  },
  {
    title: "Radiology and Additional Diagnostics",
    audience: "Applicants requiring imaging and specialty tests",
    description:
      "The public service catalog lists ultrasound, X-ray, ECG, pulmonary testing, audiometry, stress testing, and other specialty examinations.",
    items: [
      "Ultrasound studies including abdomen, thyroid, breast, and KUB",
      "X-ray studies such as thorax, lumbar, AP, PA, and oblique views",
      "ECG, stress test, and 2D echo services",
      "Audiometry, whisper test, and visual-acuity testing",
      "Drug, alcohol, and pulmonary function testing",
    ],
  },
] as const;

export const trustStats = [
  { value: "46+", label: "Years highlighted on the public site" },
  { value: "24 hrs", label: "Result turnaround cited for many exams" },
  { value: "DOH", label: "Accreditation emphasized publicly" },
  { value: "Intramuros", label: "Clinic location in Manila" },
] as const;

export const preparationChecklist = [
  "Sleep well before the examination.",
  "Avoid smoking, alcohol, and caffeinated drinks before the exam where possible.",
  "Bring a valid ID or passport and any company referral documentation.",
  "Prepare employer-required photos and supporting papers before your visit.",
  "Disclose relevant medical conditions honestly during evaluation.",
] as const;

export const visitChecklist = [
  "Confirm your referral or employer instruction sheet.",
  "Bring a valid government ID or passport.",
  "Prepare any required company letter and recent photos.",
  "Arrive during clinic hours for coordinated processing.",
] as const;

// Arizona ESA state config. Seeded from the 2025-2026 ESA Parent Handbook.
// IN PROGRESS — categories/flags are set; the full eligibility lists get wired
// into the engine in a later step. Nothing imports this yet.
export const AZ = {
  code: "AZ",
  name: "Arizona",
  program: "Empowerment Scholarship Account",
  programShort: "ESA",
  platform: "ClassWallet",
  settings: [
    { value: "homeschool", label: "Homeschool" },
    { value: "microschool", label: "Microschool" },
    { value: "private", label: "Private school" },
  ],
  // Statutory approved purchasing categories (A.R.S. §15-2402(B)(4)).
  categories: [
    "Tuition or fees at a qualified school",
    "Required textbooks at a qualified school",
    "Tutoring or teaching services",
    "Curricula and supplementary material",
    "Nationally standardized / grade-level tests (incl. AP, ACT, SAT)",
    "Nonpublic online learning program",
    "Postsecondary tuition and required textbooks",
    "Services provided by a public school",
    "Uniforms",
    "Public transportation services",
    "Computer hardware and technological devices",
    "Insurance or surety bond payments",
    "ESA management fees",
    // Students with a disability (extra categories):
    "Associated goods and assistive technology",
    "Educational therapy services",
    "Paraprofessional / educational aide",
    "Educational and psychological evaluations",
    "Vocational and life-skills programs",
  ],
  // ClassWallet spending methods in Arizona.
  pathways: [
    { value: "reimbursement", label: "Reimbursement — you paid out of pocket" },
    { value: "payvendor", label: "Pay Vendor — the vendor is billed directly" },
    { value: "marketplace", label: "Marketplace — ordered through ClassWallet" },
    { value: "debitcard", label: "Debit Card — ClassWallet prepaid card" },
  ],
  pathwayFields: {
    reimbursement: { receipt: true, payment: true, date: true },
    payvendor: { receipt: false, payment: false, date: false, invoiceOptional: true },
    marketplace: { receipt: false, payment: false, date: true, invoiceOptional: true, marketplace: true },
    debitcard: { receipt: true, payment: false, date: true },
  },
  docs: {
    receipt: ["Vendor name, address, and contact", "Receipt date", "Receipt / transaction / order number", "Itemized list and description", "Itemized and total amount"],
    invoice: ["Provider name, address, and contact", "Invoice date", "Invoice number", "Student name", "Itemized services + dates of service + charges", "Total amount", "Therapist/examiner license number (if applicable)", "Proof of payment (for reimbursement)"],
  },
  // Quarterly documentation deadlines (debit card + reimbursement).
  deadlines: [
    { q: 1, dates: "Jul 1 – Sep 30", due: "Oct 31" },
    { q: 2, dates: "Oct 1 – Dec 31", due: "Jan 31" },
    { q: 3, dates: "Jan 1 – Mar 31", due: "Apr 30" },
    { q: 4, dates: "Apr 1 – Jun 30", due: "Jul 31" },
  ],
  // Arizona differs from Arkansas in exactly these switches.
  features: {
    splitReimbursement: false,  // AZ forbids using one student's funds for another
    techCap: false,             // no $1,000 tech cap
    percentCaps: false,         // no 25% caps
    priceGuidance: false,       // no published per-item price sheet
    coCurricularChecklist: false,
    quarterlyDeadlines: true,   // hard quarterly documentation deadlines
    perStudentAward: true,      // award varies widely (base vs disability) — parent enters it
    curriculumDoc: true,        // curriculum documentation required for supplemental material
    fiveSubjectRule: true,      // must spend on reading, grammar, math, social studies, science
    providerAccreditation: true,// tutors/therapists need credential on file (except Pay Vendor)
  },
};

export default AZ;

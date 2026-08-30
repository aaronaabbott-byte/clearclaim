// Utah Fits All (UFA) state config. Seeded from the Odyssey UFA Handbook
// (support.withodyssey.com) and Utah Code 53F-6-402. Utah runs on ODYSSEY, not
// ClassWallet — that's the key difference from Arkansas/Arizona.
export const UT = {
  code: "UT",
  name: "Utah",
  program: "Utah Fits All Scholarship",
  programShort: "UFA",
  platform: "Odyssey",
  settings: [
    { value: "homeschool", label: "Homeschool" },
    { value: "microschool", label: "Microschool" },
    { value: "private", label: "Private school" },
  ],
  // Award varies by setting + age, so the parent enters their amount per student.
  // Reference (2025-26): private/other $8,000; homeschool 12-18 $6,000; 5-11 $4,000.
  funding: { note: "Award varies: $8,000 private/other · $6,000 homeschool age 12-18 · $4,000 homeschool age 5-11.", year: "2025-26" },
  categories: [
    "Tuition or registration fees",
    "Individual courses / course packages",
    "Tutoring services",
    "After-school or summer education program",
    "Extracurricular activities (20% cap)",
    "Physical education (20% cap)",
    "Fine arts instruction",
    "Educational therapies (OT, PT, speech, behavioral, audiology)",
    "Curriculum and instructional materials",
    "Educational software and applications",
    "Educational supplies",
    "Electronics and technology",
    "Transportation (fee-for-service)",
    "Exam fees (norm-referenced, AP, industry cert, college admission)",
    "Technical college fees and materials",
  ],
  // Odyssey spending methods.
  pathways: [
    { value: "reimbursement", label: "Reimbursement — you paid out of pocket" },
    { value: "marketplace", label: "Marketplace — ordered through Odyssey" },
    { value: "payprovider", label: "Pay a provider — school or provider billed directly" },
  ],
  pathwayFields: {
    reimbursement: { receipt: true, payment: true, date: true },
    marketplace: { receipt: false, payment: false, date: true, invoiceOptional: true, marketplace: true },
    payprovider: { receipt: false, payment: false, date: true, invoiceOptional: true },
  },
  docs: {
    receipt: ["Vendor name and contact", "Receipt date", "Itemized list and description", "Itemized and total amount", "Proof of payment (for reimbursement)"],
    invoice: ["Provider name and contact", "Invoice date", "Student name", "Itemized services with start/end dates", "Total amount"],
  },
  // Percentage/dollar caps unique to Utah.
  caps: {
    extracurricularPct: 0.20,
    physicalEducationPct: 0.20,
    transportationMax: 750,
    electronics: { computer: 1500, monitor: 500, camera: 500, headphones: 200 }, // per item + quantity caps
  },
  features: {
    splitReimbursement: false,
    techCap: false,             // no single tech cap — per-item electronics price caps instead
    // Utah DOES have 20%/20% caps, but they're a percentage of a per-student
    // award we don't hold a number for yet, and the dashboard meter is the
    // Arkansas fixed-dollar model. So this stays false (no AR meter); the 20%
    // caps are surfaced in the eligibility checker + submit-steps instead.
    percentCaps: false,
    electronicsPriceCaps: true,
    priceGuidance: false,
    coCurricularChecklist: false,
    quarterlyDeadlines: false,  // reimbursements processed within ~10 business days
    perStudentAward: true,      // tiered by setting/age — parent enters it
    curriculumDoc: true,        // Odyssey looks for educational justification
    providerAccreditation: true,
    studentPortfolio: true,     // families keep a student portfolio
  },
  // Eligibility from the Odyssey Eligible / Ineligible Expense Guides.
  eligibility: {
    banned: [
      { kw: ["furniture", "desk", "computer stand", "tv mount", "wall decor", "gaming chair", "floor lamp", "light fixture", "lighting"], label: "Furniture" },
      { kw: ["apparel", "uniform", "costume", "clothing", "shoes", "footwear"], label: "Apparel" },
      { kw: ["instrument purchase", "buy instrument", "violin", "guitar", "piano", "trumpet", "flute", "cello", "drum set"], label: "Musical instrument purchase (rental only)" },
      { kw: ["power tool", "hand tool", "drill", "saw"], label: "Power / hand tools" },
      { kw: ["firearm", "gun", "ammunition"], label: "Firearms" },
      { kw: ["playground", "playset", "swing set"], label: "Playground equipment" },
      { kw: ["animal", "livestock", "pet", "chicken", "insect"], label: "Animals / livestock / pets" },
      { kw: ["video game", "board game", "playing card", "trading card"], label: "Non-educational games" },
      { kw: ["food", "meal kit", "meal plan", "snack", "groceries"], label: "Food / meal kits" },
      { kw: ["netflix", "hulu", "streaming", "disney+", "spotify"], label: "Entertainment streaming" },
      { kw: ["applecare", "warranty", "protection plan", "cloud storage", "insurance"], label: "Warranty / protection / insurance" },
      { kw: ["ski pass", "lift ticket", "snow sport", "season ticket", "theme park", "amusement park"], label: "Recreation passes / tickets" },
      { kw: ["movie ticket", "theater ticket", "sporting event", "concert ticket"], label: "Entertainment tickets" },
      { kw: ["overnight camp", "sleepaway camp"], label: "Overnight / sleepaway camp" },
      { kw: ["smartphone", "cell phone", "smart watch", "smartwatch", "speaker", "record player", "digital picture frame"], label: "Ineligible electronics" },
      { kw: ["bicycle", "scooter", "skateboard", "dumbbell", "barbell", "weight set", "resistance band", "pull up bar", "basketball hoop", "trampoline", "golf club", "punching bag", "rollerblade", "roller skate", "ice skate"], label: "Recreational / gym equipment" },
      { kw: ["fuel", "gas card", "plane ticket", "bus pass", "train pass", "tourism"], label: "Ineligible transportation" },
      { kw: ["phone case", "tablet case", "device case"], label: "Cases / accessories (unless bundled)" },
      { kw: ["bulk", "wholesale", "resale", "resell"], label: "Bulk / resale purchases" },
    ],
    conditional: [
      { kw: ["instrument rental", "rent instrument", "instrument lease"], label: "Instrument rental", note: "Rentals are eligible for the majority of the scholarship year; purchases are not." },
      { kw: ["laptop", "desktop", "tablet", "computer", "printer", "3d printer"], label: "Computer / printer", note: "Eligible up to $1,500 per item (plus a quantity cap)." },
      { kw: ["monitor"], label: "Monitor", note: "Eligible up to $500 per item." },
      { kw: ["camera"], label: "Camera", note: "Eligible up to $500 per item." },
      { kw: ["headphone", "earbud"], label: "Headphones", note: "Eligible up to $200." },
      { kw: ["extracurricular"], label: "Extracurricular", note: "Eligible up to 20% of the student's scholarship." },
      { kw: ["physical education", "pe class"], label: "Physical education", note: "Eligible up to 20% of the student's scholarship." },
      { kw: ["transportation", "rideshare", "taxi"], label: "Transportation", note: "Fee-for-service to/from a provider, up to $750/year; give start and end destinations." },
      { kw: ["summer camp", "day camp"], label: "Camp", note: "Eligible only if the primary purpose is academic or skill-based instruction." },
      { kw: ["magazine", "subscription"], label: "Subscription", note: "Eligible only if it has an educational focus (e.g. Highlights); entertainment subscriptions are not." },
    ],
    generalEd: [
      { kw: ["curriculum", "textbook", "instructional material", "workbook"], label: "Curriculum / instructional materials" },
      { kw: ["educational software", "learning app", "educational app"], label: "Educational software / apps" },
      { kw: ["stem kit", "science kit", "manipulative", "learning manipulative"], label: "STEM kits / manipulatives" },
      { kw: ["art supplies", "paint", "canvas", "glue", "colored pencil"], label: "Art supplies" },
      { kw: ["pen", "paper", "pencil", "notebook", "binder", "folder"], label: "Educational materials" },
      { kw: ["calculator"], label: "Calculator" },
      { kw: ["assistive device", "assistive technology"], label: "Assistive devices" },
      { kw: ["internet service", "internet fee", "broadband"], label: "Internet service fees" },
      { kw: ["tutoring", "tutor"], label: "Tutoring" },
      { kw: ["exam fee", "ap exam", "test fee", "sat", "act"], label: "Exam fees" },
    ],
  },
};

export default UT;

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

  // Eligibility lists from the 2025-2026 ESA Parent Handbook (Ch. 3). Keyword
  // matching is lowercase-substring. Not exhaustive — the Department decides.
  eligibility: {
    // Prohibited (A.R.S. §15-2402). Buying these can suspend an account.
    banned: [
      { kw: ["entertainment"], label: "Entertainment" },
      { kw: ["home theater", "home theatre"], label: "Home theater equipment" },
      { kw: ["television", " tv "], label: "Televisions" },
      { kw: ["telephone", "smartphone", "cell phone"], label: "Telephones" },
      { kw: ["video game", "game console", "gaming console"], label: "Video game consoles/accessories" },
      { kw: ["amazon prime", "prime membership"], label: "Amazon Prime / similar fees" },
      { kw: ["amusement park", "theme park", "water park", "waterpark"], label: "Amusement/theme/water park tickets" },
      { kw: ["installation fee", "assembly fee"], label: "Assembly/installation fees" },
      { kw: ["backpack", "lunch box", "lunchbox", "water bottle"], label: "Backpacks, lunch boxes, water bottles" },
      { kw: ["bbq", "smoker", "fire pit"], label: "BBQ grills, smokers, fire pits" },
      { kw: ["bedding", "comforter", "sheets set"], label: "Bedding" },
      { kw: ["bounce house", "water slide"], label: "Bounce houses / water slides" },
      { kw: ["car seat"], label: "Children's car seats" },
      { kw: ["clothing", "shirt", "pants", "dress "], label: "Clothing (non-uniform)" },
      { kw: ["footwear", "shoes", "sneaker", "boots"], label: "Footwear" },
      { kw: ["espresso machine", "freeze dryer", "freeze-dryer", "dehydrator", "commercial grade", "industrial grade"], label: "Commercial/industrial appliances" },
      { kw: ["consultation fee"], label: "Consultation fees" },
      { kw: ["day care", "daycare"], label: "Day care fees" },
      { kw: ["dining", "restaurant"], label: "Dining" },
      { kw: ["dog training"], label: "Dog training" },
      { kw: ["food", "snack", "groceries", "animal feed"], label: "Food" },
      { kw: ["gift card"], label: "Gift cards" },
      { kw: ["home improvement", "irrigation", "water filtration", "concrete", "water pump"], label: "Home-improvement items" },
      { kw: ["home furnishing", "wall art", "floor lamp", "nightstand", "vanity desk", "door mat", "locker"], label: "Home furnishings/fixtures" },
      { kw: ["hotel", "lodging", "airbnb"], label: "Hotel and lodging" },
      { kw: ["cleaning supplies", "household cleaning"], label: "Household cleaning supplies" },
      { kw: ["jewelry", "precious metal"], label: "Jewelry and precious metals" },
      { kw: ["real property", "land purchase"], label: "Land / real property" },
      { kw: ["refrigerator", "freezer", "microwave", "stove", "ice machine", "large appliance"], label: "Large appliances" },
      { kw: ["lawn", "landscaping", "lawn mower", "lawnmower", "weed eater"], label: "Lawn/landscaping equipment" },
      { kw: ["medication", "vitamin", "supplement"], label: "Medications, vitamins, supplements" },
      { kw: ["go-kart", "go kart", "motorized scooter", "motorized vehicle", "moped"], label: "Motorized vehicles/scooters" },
      { kw: ["yearbook", "picture day", "cap and gown", "spirit day", "parking pass", "pta "], label: "Non-educational school fees" },
      { kw: ["pizza oven"], label: "Pizza ovens" },
      { kw: ["solar panel"], label: "Solar panels/systems" },
      { kw: ["swimming pool", "sauna", "pond"], label: "Swimming pools, saunas, ponds" },
      { kw: ["trailer"], label: "Trailers" },
      { kw: ["weapon", "ammunition", "bb gun", "airsoft", "paintball gun"], label: "Weapons and ammunition" },
    ],
    // Conditional — allowable within a limit; flag the limit rather than ban outright.
    conditional: [
      { kw: ["trampoline"], label: "Trampoline", note: "Allowed only if 10 ft or smaller in diameter." },
      { kw: ["chicken coop", "chicken run"], label: "Chicken coop", note: "Allowed for up to 12 chickens; larger coops/runs are not." },
      { kw: ["greenhouse"], label: "Greenhouse", note: "Allowed only with a footprint of 100 sq ft or less." },
      { kw: ["archery bow", "recurve bow", "compound bow"], label: "Archery bow", note: "Allowed for archery instruction if the draw weight is under 35 lbs." },
      { kw: ["parent training", "parent course"], label: "Parent training", note: "Only if documented as required for a student with special needs." },
    ],
    // Non-approved therapies/services (health, not educational).
    nonApprovedTherapies: [
      { kw: ["acupressure"], label: "Acupressure" }, { kw: ["acupuncture"], label: "Acupuncture" },
      { kw: ["blood work", "lab work", "labs"], label: "Blood work / labs" }, { kw: ["chiropractor", "chiropractic"], label: "Chiropractic" },
      { kw: ["craniosacral"], label: "Craniosacral therapy" }, { kw: ["dental"], label: "Dental services" },
      { kw: ["eye exam", "vision exam"], label: "Eye exams" }, { kw: ["health exam", "physical exam", "wellness exam"], label: "Health/physical exams" },
      { kw: ["hyperbaric"], label: "Hyperbaric oxygen therapy" }, { kw: ["massage"], label: "Massage therapy" },
      { kw: ["nutritionist", "dietitian"], label: "Nutritionists" }, { kw: ["reiki"], label: "Reiki" },
    ],
    // Allowable, but a curriculum must show the item is required/recommended.
    requiresCurriculum: [
      { kw: ["bento box", "compartment tray"], label: "Bento box / trays" },
      { kw: ["educational camp"], label: "Educational camp (no travel/lodging/food)" },
      { kw: ["gym membership", "pe facility", "fitness membership"], label: "Gym/PE membership (individual only — no family)" },
      { kw: ["measuring cup", "spatula", "whisk", "mixing bowl", "home economic"], label: "Home-ec accessories" },
      { kw: ["cooking appliance", "baking equipment", "sewing machine", "countertop appliance"], label: "Home-ec countertop appliances" },
      { kw: ["instrument", "violin", "guitar", "piano", "keyboard", "trumpet", "flute", "cello", "drum"], label: "Musical instruments" },
      { kw: ["photography", "camera", "dslr"], label: "Photography equipment" },
      { kw: ["pe equipment", "physical education equipment"], label: "PE equipment" },
      { kw: ["playground"], label: "Playground" },
      { kw: ["seeds", "sapling"], label: "Seeds / small saplings" },
      { kw: ["museum ticket", "zoo ticket", "orchestra ticket", "ballet ticket", "theater ticket", "single ticket"], label: "Single educational-event tickets" },
      { kw: ["smart board", "smartboard"], label: "Smart Board" },
      { kw: ["sports league", "sports camp", "sports registration"], label: "Sports league / camp (no travel/lodging/food)" },
      { kw: ["watch", "smartwatch"], label: "Watch (analog/digital)" },
      { kw: ["vocational tool", "wood shop", "auto shop", "welding"], label: "Vocational-education tools" },
    ],
    // Generally-educational — no curriculum required (subject to a pending AZ suit).
    generalEd: [
      { kw: ["art supplies", "paint", "watercolor", "canvas", "colored pencil", "crayon", "marker"], label: "Art supplies" },
      { kw: ["headphone", "earbud"], label: "Headphones / earbuds" },
      { kw: ["bat ", "ball", "glove", "racquet", "protective equipment"], label: "Basic sport items" },
      { kw: ["board game", "strategy game", "puzzle"], label: "Board/strategy games, puzzles" },
      { kw: ["bookcase", "bookshelf"], label: "Bookcase (≤40 sq ft)" },
      { kw: ["book", "audiobook", "magazine", "workbook"], label: "Books / workbooks" },
      { kw: ["compass", "protractor", "ruler"], label: "Compass / protractor / ruler" },
      { kw: ["desk", "chair"], label: "Desk (fits ≤2) and chair" },
      { kw: ["dry erase", "whiteboard", "easel"], label: "Dry-erase boards / easels" },
      { kw: ["flash card", "flashcard"], label: "Flash cards" },
      { kw: ["educational kit", "science kit"], label: "Educational kits" },
      { kw: ["software", "app subscription", "educational app"], label: "Educational software / apps" },
      { kw: ["manipulative", "math cube", "lego", "counting block"], label: "Manipulatives" },
      { kw: ["periodic table"], label: "Periodic table" },
      { kw: ["laminator", "laminating"], label: "Personal laminator / supplies" },
      { kw: ["printer", "binding", "print service"], label: "Print / binding services" },
      { kw: ["school supplies", "paper", "binder", "notebook", "folder", "stapler", "scissors", "pencil", "pen "], label: "School supplies" },
      { kw: ["timer", "clock"], label: "Timers / clocks" },
      { kw: ["calculator"], label: "Calculator" },
      { kw: ["laptop", "computer", "tablet", "e-reader", "monitor", "microscope", "telescope"], label: "Computer hardware / devices" },
    ],
  },
};

export default AZ;

// Domain logic shared by the app — ported from the ClearClaim prototype.
export const SETTINGS = [
  { value: "homeschool", label: "Homeschool" },
  { value: "school", label: "Private school" },
];

export const PATHWAYS = [
  { value: "reimbursement", label: "Reimbursement — you paid out of pocket" },
  { value: "directpay", label: "Direct Pay — the vendor is billed directly" },
];
// Fields each pathway actually needs — drives the form so parents only see what applies.
export const PATHWAY_FIELDS = {
  reimbursement: { receipt: true, payment: true, date: true },
  directpay:     { receipt: false, payment: false, date: false, invoiceOptional: true },
};

export const CATEGORIES = [
  "Educational Supplies","Curriculum / Textbooks","Technology","School Uniforms",
  "Testing Costs","Tutoring","Instructional Services (Core or Co-Curricular)",
  "Extra-Curricular, PE & Field Trips","Musical Instrument","Furniture","Other",
];

// price guidance (helper, not a hard cap)
const PRICE = [["scientific calculator",50],["graphing calculator",150],["basic calculator",15],
  ["microscope",350],["telescope",300],["desk",300],["chair",150],["headphones",100],
  ["printer",500],["monitor",150]];
// non-qualifying items, date-sensitive (Arkansas EFA example)
const NONQUAL = ["backpack","lunchbox","jeans","footwear","socks","spirit wear","gaming chair",
  "bookshelf","storage","purse","jewelry","watch","bluetooth speaker","phone case"];
const NONQUAL_DATE = "2026-08-18";

export function checkClaim(c) {
  const out = []; const push = (level, msg) => out.push({ level, msg });
  const pw = c.pathway || "reimbursement";
  if (pw === "directpay") {
    push("ok","Direct Pay — submit as a payment request to the vendor. No out-of-pocket payment, receipt, or proof of payment needed.");
    c.vendor ? push("ok","Vendor entered.") : push("fail","Choose the Direct Pay vendor.");
  } else {
    c.receipt_count ? push("ok","Receipt attached.") : push("fail","No receipt attached.");
    c.payment_count ? push("ok","Proof of payment attached.") : push("warn","No proof-of-payment screenshot — strongly recommended (required in practice for PayPal charges).");
    c.date ? push("ok","Date entered.") : push("fail","No date — the receipt must show an actual date.");
    c.vendor ? push("ok","Store/vendor entered.") : push("warn","No store name — the receipt must clearly show the store.");
  }
  (+c.amount > 0) ? push("ok","Amount entered.") : push("fail","No amount entered.");
  c.category ? push("ok","Category selected.") : push("fail","Pick one expense category.");
  (c.purpose || c.reasoning) ? push("ok","Educational reasoning provided.") : push("warn","Add a short note on how the student uses these items.");
  const hay = ((c.items||"")+" "+(c.purpose||"")+" "+(c.vendor||"")).toLowerCase();
  const hit = NONQUAL.find(k => hay.includes(k));
  if (hit) {
    const after = c.date && c.date >= NONQUAL_DATE;
    push(after ? "fail" : "warn", `Contains "${hit}", on the non-qualifying list (effective ${NONQUAL_DATE}). ` +
      (after ? "Purchased on/after that date, so likely ineligible." : "Purchased before that date, so likely grandfathered — keep the date visible."));
  }
  PRICE.forEach(([k,max]) => { if (hay.includes(k) && +c.amount > max)
    push("warn", `Amount over the $${max} price-guidance figure for "${k}" — allowed, but justify it.`); });
  return out;
}

// ---------------------------------------------------------------------------
// Co-curricular course checklist (Arkansas EFA, 6 CAR § 35-102).
// A class must meet ALL ten requirements to be approved as co-curricular.
// Each requirement pairs with the document a family can send in as evidence.
// ---------------------------------------------------------------------------
export const COCURRICULAR = {
  source:
    "6 CAR § 35-102 (Definitions). All expenses must also be ordinary and necessary under § 35-114 and § 35-115.",
  intro:
    "Use this before you enroll. A class must meet all ten requirements to be approved as a co-curricular course. Check each box and gather the matching document to send in with the expense.",
  requirements: [
    { id: "extends",   requirement: "It builds on or extends your student's main academic program",
      doc: "A short note from you, or the page of your education plan, showing how this course fits your student's program for the year." },
    { id: "academic",  requirement: "It contributes to your student's academic development",
      doc: "The course description showing what skills or knowledge your student will gain." },
    { id: "structured", requirement: "It teaches structured content in an instructional setting",
      doc: "The class schedule plus a description of where it meets: classroom, studio, lab, or live online class." },
    { id: "standards", requirement: "It lines up with academic standards, educational goals, or subject-area skills",
      doc: "The part of the syllabus that lists the standards or skills covered, or the provider's written statement of what the course aligns to." },
    { id: "noncore",   requirement: "It is not one of your student's required core subjects",
      doc: "Your education plan or school course list showing this course is in addition to the core subjects." },
    { id: "subject",   requirement: "It has a written academic connection to a recognized subject area",
      doc: "The course title and description naming the subject, e.g. Dance, Spanish, or Computer Science." },
    { id: "instructor", requirement: "The instructor knows the subject",
      doc: "The instructor's bio, resume, degree, certification, or a short summary of their experience in the subject." },
    { id: "design",    requirement: "It has real instructional design",
      doc: "The syllabus, the written learning objectives, and a description of how students are graded or assessed — together showing what your student will know or be able to do by the end. A weekly list of skills to be practiced is not enough." },
    { id: "plan",      requirement: "It supports the academic goals in your student's education plan or school curriculum",
      doc: "The part of your education plan or your school's curriculum outline that includes this course." },
    { id: "comparable", requirement: "It is the kind of course Arkansas public schools offer",
      doc: "The name of the comparable public-school course, if you know it. If unsure, tell the program the subject and they will check." },
  ],
  warnings: [
    "A document called a \"syllabus\" is not automatically enough. Many providers hand out a weekly schedule of skills — that says what the class will do, not what your student will learn or how anyone will know they learned it. Ask whether the document states learning objectives, connects to a subject area, and explains how progress is assessed. If not, the class is likely extracurricular.",
    "One document often covers several rows. A complete syllabus with learning objectives, an assessment plan, and an instructor bio can satisfy most of this list on its own. Ask your provider for it before you enroll.",
    "If your class cannot meet every requirement, it may still qualify. Structured classes without a syllabus or assessments are often approved as extracurricular activities instead — contact the program if you are unsure which category fits.",
  ],
};

// Evaluate a co-curricular class against the checklist.
// `checkedIds` is an array of requirement ids the family has confirmed.
export function checkCocurricular(checkedIds) {
  const ids = new Set(checkedIds || []);
  const met = COCURRICULAR.requirements.filter(r => ids.has(r.id));
  const missing = COCURRICULAR.requirements.filter(r => !ids.has(r.id));
  return {
    total: COCURRICULAR.requirements.length,
    metCount: met.length,
    missing,
    qualifies: missing.length === 0,
    likelyExtracurricular: !ids.has("design") || !ids.has("standards"),
  };
}

export function draftReasoning(c, kid) {
  const nm = (kid && kid.first_name) || "my student";
  const gr = (kid && kid.grade) ? `grade-${kid.grade} ` : "";
  const setting = (kid && kid.setting) || "homeschool";
  const items = c.items ? ` — including ${c.items.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).slice(0,6).join(", ")}` : "";
  const use = c.purpose ? ` ${c.purpose.trim().replace(/\.?$/,".")}` : "";
  if (setting === "homeschool") return `These are curriculum and supplies for ${nm}'s ${gr}homeschool this year${items}. ${nm} uses them for daily lessons and coursework at home.${use}`;
  const where = (kid && kid.school_name) ? ` at ${kid.school_name}` : "";
  return `These are required materials for ${nm}'s ${gr}courses${where}${items}. Each is used for the classes ${nm} is enrolled in this year.${use}`;
}

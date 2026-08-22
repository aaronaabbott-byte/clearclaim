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
  "Extra-Curricular, PE & Field Trips","Travel / Mileage (approved trips)",
  "Musical Instrument","Furniture","Other",
];

// Program funding reference (Arkansas EFA, 2026-27). NET amounts after fees.
export const FUNDING = {
  year: "2026-27",
  nonSucceed: { annual: 7208, quarterly: 1802 },
  succeed:    { annual: 8011, quarterly: 2002.75 },
  quarterlyDates: ["Aug 20", "Oct 29", "Feb 4", "Apr 8"],
  extracurricularCapPct: 0.25,   // travel, PE, field trips, extracurriculars
  travelCapPct: 0.25,
  techCapPerStudent: 1000,
  mileageRate: 0.52,
  deskMax: 300, chairMax: 150,   // one of each per student; no gaming chair
};
// 25% cap in dollars for a standard (non-Succeed) student this year.
const CAP_25 = Math.round(FUNDING.nonSucceed.annual * 0.25); // ~$1,802

// The Arkansas EFA budget year runs Aug 1 – Jul 31 (Q1 funds drop ~Aug 20).
export function efaBudgetYear(dateStr) {
  const d = dateStr ? new Date(dateStr.length <= 10 ? dateStr + "T00:00:00" : dateStr) : new Date();
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; // month 7 = August
  return {
    startYear: y,
    label: `${y}–${String((y + 1) % 100).padStart(2, "0")}`,
    start: `${y}-08-01`,
    end: `${y + 1}-07-31`,
  };
}
export function claimDate(c) { return c.date || (c.created_at ? String(c.created_at).slice(0, 10) : null); }
export function inBudgetYear(c, by) { const d = claimDate(c); return !!d && d >= by.start && d <= by.end; }

// Funding tiers a student can be on. The 25% caps scale with annual funding.
export const FUNDING_TIERS = [
  { value: "standard", label: "Standard ($7,208/yr)" },
  { value: "succeed", label: "Succeed ($8,011/yr)" },
];
export function annualFunding(tier) {
  return tier === "succeed" ? FUNDING.succeed.annual : FUNDING.nonSucceed.annual;
}
export function annualCaps(tier) {
  const cap25 = Math.round(annualFunding(tier) * 0.25);
  return { technology: FUNDING.techCapPerStudent, extracurricular: cap25, travel: cap25 };
}

// Caps that accumulate per student, per budget year. `tier` scales the 25% caps.
// Returns null for uncapped categories.
export function categoryCap(category, tier) {
  const c = (category || "").toLowerCase();
  const caps = annualCaps(tier);
  if (c.includes("technology"))
    return { key: "technology", label: "Technology", amount: caps.technology };
  if (c.includes("extra-curricular") || c.includes("field trip") || c.includes(" pe"))
    return { key: "extracurricular", label: "Extracurricular / PE / field trips", amount: caps.extracurricular };
  if (c.includes("travel") || c.includes("mileage"))
    return { key: "travel", label: "Travel / mileage", amount: caps.travel };
  return null;
}
// Sum a student's prior claims that fall under the same cap in the same budget year.
export function priorCapSpend(claims, kidId, capKey, by, excludeId) {
  return (claims || [])
    .filter(c => c.kid_id === kidId && c.id !== excludeId
      && (categoryCap(c.category) || {}).key === capKey && inBudgetYear(c, by))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
}

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

  // Category-specific caps and guidance (Arkansas EFA FAQ).
  const cat = (c.category || "").toLowerCase();
  const amt = +c.amount || 0;
  if (cat.includes("technology")) {
    push(amt > 1000 ? "warn" : "ok", amt > 1000
      ? "Over the $1,000/student/year technology cap (all tech shares it: computers, tablets, printers, headphones, accessories). Above it needs a documented exception approved in advance."
      : "Counts toward the $1,000/student/year technology cap. Note an e-reader counts as a tablet — you can't claim both.");
  }
  if (cat.includes("extra-curricular") || cat.includes("field trip") || cat.includes(" pe")) {
    push("warn", `Draws from the 25% extracurricular/PE/field-trip cap (~$${CAP_25}/student this year). Memberships and family passes count here — split a family pass across the students who use it.`);
  }
  if (cat.includes("travel") || cat.includes("mileage")) {
    push("warn", `Approved travel is reimbursed at $${FUNDING.mileageRate}/mile and draws from the 25% travel cap (~$${CAP_25}/student). Attach a completed mileage log with dates, destinations, and miles.`);
  }
  if (cat.includes("curriculum")) {
    push("ok", "Core curriculum from any store is always 100% reimbursable — include an itemized receipt; a bank/card statement showing the charge cleared makes it airtight.");
  }
  if (cat.includes("furniture")) {
    push("ok", `Furniture: one desk (≤$${FUNDING.deskMax}) and one chair (≤$${FUNDING.chairMax}) per student. No gaming or storage furniture.`);
  }

  // Keyword guidance that cuts across categories.
  if (/(internet|wi-?fi|broadband)/.test(hay) && /(month|service|bill|subscription|fee|plan)/.test(hay))
    push("fail", "Internet service fees aren't reimbursable — only equipment used to access the internet. (For service costs, look at the federal Affordable Connectivity Program.)");
  if (/(membership|family pass|season pass|zoo|museum)/.test(hay))
    push("warn", "Memberships/passes are extracurricular — they come from the 25% cap. Buy a child-only pass, or split a family pass across your funded students.");
  if (/\bused\b|second-?hand|pre-?owned|refurbished/.test(hay))
    push("warn", "Used items can be reimbursed, but follow ADE's used-item rules — keep proof of the item, its condition, and what you paid.");
  if (/subscription/.test(hay) && !cat.includes("technology"))
    push("warn", "Subscriptions are approved case-by-case (reimbursement-only for some). Check it against the ADE approved-subscription list before relying on it.");

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

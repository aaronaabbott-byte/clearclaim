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

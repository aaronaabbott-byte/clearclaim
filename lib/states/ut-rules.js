// Utah Fits All (UFA) eligibility checks. Same output shape as lib/rules.js
// checkClaim so the claim builder renders it identically. Source: Odyssey UFA
// Eligible / Ineligible Expense Guides.
import { UT } from "./ut";

const hit = (text, list) => list.find(e => e.kw.some(k => text.includes(k)));

export function screenUT(description) {
  const t = (description || "").toLowerCase();
  const E = UT.eligibility;
  let e;
  if ((e = hit(t, E.banned))) return { classification: "banned", label: e.label };
  if ((e = hit(t, E.conditional))) return { classification: "conditional", label: e.label, note: e.note };
  if ((e = hit(t, E.generalEd))) return { classification: "generaled", label: e.label };
  return { classification: "unknown" };
}

export function checkClaimUT(c) {
  const out = [];
  const push = (level, msg) => out.push({ level, msg });
  const pw = c.pathway || "reimbursement";

  if (pw === "reimbursement") {
    c.receipt_count ? push("ok", "Receipt attached.") : push("fail", "Attach an itemized receipt.");
    c.payment_count ? push("ok", "Proof of payment attached.") : push("warn", "Add proof of payment for the reimbursement.");
    c.date ? push("ok", "Date entered.") : push("warn", "Add the purchase date — it must fall within the scholarship year (Jul 1–Jun 30).");
  } else if (pw === "payprovider") {
    push("ok", "Pay a provider — upload a complete invoice with the service start and end dates.");
    c.vendor ? push("ok", "Provider entered.") : push("warn", "Choose the provider.");
  } else if (pw === "marketplace") {
    push("ok", "Marketplace — order through Odyssey's Marketplace; pre-approved items ship after review.");
  }

  (+c.amount > 0) ? push("ok", "Amount entered.") : push("fail", "No amount entered.");
  c.category ? push("ok", "Category selected.") : push("fail", "Pick one category.");

  const desc = ((c.items || "") + " " + (c.purpose || "") + " " + (c.vendor || "")).trim();
  if (desc) {
    const s = screenUT(desc);
    const L = s.label ? `"${s.label}"` : "This item";
    if (s.classification === "banned")
      push("fail", `${L} is ineligible under Utah Fits All (Odyssey's ineligible list). Many of these are set by state code and can't be appealed.`);
    else if (s.classification === "conditional")
      push("warn", `${L}: ${s.note}`);
    else if (s.classification === "generaled")
      push("ok", `${L} is generally eligible — keep an itemized receipt and note the educational use.`);
    else
      push("warn", "Not on a standard list — Utah funds items that are inherently educational, not general-purpose items merely used for school. Be ready to justify it, or submit an eligibility request in Odyssey first.");
  }

  const cat = (c.category || "").toLowerCase();
  if (cat.includes("extracurricular"))
    push("warn", "Extracurricular spending is capped at 20% of the student's scholarship.");
  if (cat.includes("physical education"))
    push("warn", "Physical-education spending is capped at 20% of the student's scholarship (separate from the extracurricular 20%).");
  if (cat.includes("transportation"))
    push("warn", "Transportation is fee-for-service to/from a provider only, up to $750/year — include the start and end destinations.");
  if (cat.includes("electronics") || cat.includes("technology"))
    push("warn", "Electronics have per-item price caps: computers/printers $1,500, monitors/cameras $500, headphones $200 (plus quantity caps).");

  if ((cat.includes("tutoring") || cat.includes("therap") || cat.includes("instruction") || cat.includes("fine arts")) &&
      (pw === "reimbursement"))
    push("warn", "Include the provider's credential/accreditation with the submission where the program requires it.");

  push("ok", "Keep a student portfolio (samples of work) — Utah Fits All expects families to maintain one.");

  return out;
}

export default checkClaimUT;

// Arizona ESA eligibility checks. Mirrors the shape of lib/rules.js checkClaim
// so the claim builder can render either state's results the same way.
// Source: Arizona ESA 2025-2026 Parent Handbook, Chapter 3.
import { AZ } from "./az";

const hit = (text, list) => list.find(e => e.kw.some(k => text.includes(k)));

// Classify a description against Arizona's lists. Order matters: hard bans win.
export function screenAZ(description) {
  const t = (description || "").toLowerCase();
  const E = AZ.eligibility;
  let e;
  if ((e = hit(t, E.banned))) return { classification: "banned", label: e.label };
  if ((e = hit(t, E.nonApprovedTherapies))) return { classification: "therapy", label: e.label };
  if ((e = hit(t, E.conditional))) return { classification: "conditional", label: e.label, note: e.note };
  if ((e = hit(t, E.requiresCurriculum))) return { classification: "curriculum", label: e.label };
  if ((e = hit(t, E.generalEd))) return { classification: "generaled", label: e.label };
  return { classification: "unknown" };
}

// Returns [{ level: "ok"|"warn"|"fail", msg }] like the Arkansas engine.
export function checkClaimAZ(c) {
  const out = [];
  const push = (level, msg) => out.push({ level, msg });
  const pw = c.pathway || "reimbursement";

  if (pw === "reimbursement") {
    c.receipt_count ? push("ok", "Receipt attached.") : push("fail", "Attach an itemized receipt.");
    c.payment_count ? push("ok", "Proof of payment attached.") : push("fail", "Proof of payment is required — an invoice alone is denied for reimbursement.");
    c.date ? push("ok", "Date entered.") : push("warn", "Add the receipt/order date.");
  } else if (pw === "payvendor") {
    push("ok", "Pay Vendor — upload a complete invoice. No accreditation needed; registered ClassWallet vendors are already vetted.");
    c.vendor ? push("ok", "Vendor entered.") : push("warn", "Choose the Pay Vendor.");
  } else if (pw === "marketplace") {
    push("ok", "Marketplace — the order ships to your address on file once ESA staff approve it.");
  } else if (pw === "debitcard") {
    push("warn", "Debit Card — keep the receipt and upload it (plus any provider credential) by the quarterly deadline, or you must repay it.");
    c.date ? push("ok", "Date entered.") : push("warn", "Add the purchase date.");
  }

  (+c.amount > 0) ? push("ok", "Amount entered.") : push("fail", "No amount entered.");
  c.category ? push("ok", "Category selected.") : push("fail", "Pick one ESA category.");

  // Eligibility screen against the Arizona lists.
  const desc = ((c.items || "") + " " + (c.purpose || "") + " " + (c.vendor || "")).trim();
  if (desc) {
    const s = screenAZ(desc);
    const L = s.label ? `"${s.label}"` : "This item";
    if (s.classification === "banned")
      push("fail", `${L} is on Arizona's prohibited list — buying it with ESA funds can suspend the account.`);
    else if (s.classification === "therapy")
      push("fail", `${L} is a non-approved therapy/service under the ESA program.`);
    else if (s.classification === "conditional")
      push("warn", `${L}: ${s.note}`);
    else if (s.classification === "curriculum")
      push("warn", `${L} needs curriculum documentation showing it's required or recommended — attach a syllabus/curriculum (student name, course of study, objectives, lesson plans, and this item as required material).`);
    else if (s.classification === "generaled")
      push("ok", `${L} is generally educational and allowed without a curriculum — keep an itemized receipt.`);
    else
      push("warn", "Not on a standard list — Arizona approves expenses that are primarily educational. Be ready to justify it, ideally with a curriculum.");
  }

  // Provider accreditation (tutoring/teaching/therapy) for Debit Card + Reimbursement.
  const cat = (c.category || "").toLowerCase();
  if ((cat.includes("tutoring") || cat.includes("teaching") || cat.includes("therapy") || cat.includes("instruction")) &&
      (pw === "debitcard" || pw === "reimbursement"))
    push("warn", "Include the provider's accreditation/credential (or the tutoring attestation form) with this submission. Screenshots aren't accepted. Not required for Pay Vendor.");

  // Quarterly documentation deadline reminder.
  if (pw === "debitcard" || pw === "reimbursement")
    push("warn", "Arizona documentation is due by the end of the month after each quarter (Oct 31 / Jan 31 / Apr 30 / Jul 31).");

  // Five-subject spending rule (informational).
  push("ok", "Reminder: each student's ESA must be spent across reading, grammar, math, social studies, and science.");

  return out;
}

export default checkClaimAZ;

// Notification templates + a dedupe-aware sender. Used by the notifications cron.
// Every send is recorded in notification_log first-checked so the same message
// never goes out twice.
import { sendEmail, wrapHtml } from "@/lib/email";

const APP = process.env.NEXT_PUBLIC_SITE_URL || "https://clearclaimapp.com";
const money = (n) => (n == null || n === "" ? "" : `$${Number(n).toFixed(2)}`);

// Send one notification unless an identical one was already sent. Returns
// "sent" | "skipped" | "error". admin = service-role client.
export async function sendOnce(admin, { userId, kind, refId = null, dedupeKey = "", to, subject, html, text, meta = {} }) {
  if (!to) return "skipped";
  // Already sent? (unique on user+kind+ref+dedupeKey)
  const { data: existing } = await admin
    .from("notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("ref_id", refId ?? "")
    .eq("dedupe_key", dedupeKey)
    .limit(1)
    .maybeSingle();
  if (existing) return "skipped";

  const res = await sendEmail({ to, subject, html, text });
  if (res?.error) return "error";
  // Record it (even on a dev no-op "skipped" send, so previews don't pile up).
  await admin.from("notification_log").insert({
    user_id: userId, kind, ref_id: refId ?? "", dedupe_key: dedupeKey,
    to_address: to, meta,
  });
  return "sent";
}

// ───────── templates ─────────

export function approvedEmail(claim) {
  const item = claim.items || claim.vendor || "your purchase";
  const amt = money(claim.amount);
  return {
    subject: `Approved: ${item}${amt ? ` (${amt})` : ""}`,
    html: wrapHtml("Your claim was approved 🎉", `
      <p style="margin:0 0 12px">Good news — the claim for <b>${esc(item)}</b>${amt ? ` for <b>${amt}</b>` : ""} is marked approved.</p>
      <p style="margin:0 0 16px">Keep the receipt and approval on file in case the program asks for it later. You can review it any time in ClearClaim.</p>
      <a href="${APP}/dashboard" style="display:inline-block;background:#15264b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9px;font-weight:600">Open ClearClaim</a>`),
    text: `Your ClearClaim claim for ${item}${amt ? ` (${amt})` : ""} is marked approved. Review it at ${APP}/dashboard`,
  };
}

export function missingEmail(claim, missing) {
  const item = claim.items || claim.vendor || "a claim";
  const list = missing.map(m => `<li style="margin:4px 0">${esc(m)}</li>`).join("");
  return {
    subject: `Before you submit: ${item} is missing something`,
    html: wrapHtml("One thing to fix before submitting", `
      <p style="margin:0 0 10px">Your claim for <b>${esc(item)}</b> looks almost ready, but it's missing:</p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#5b667d">${list}</ul>
      <p style="margin:0 0 16px">Add it and you'll be good to submit. This is the most common reason claims get bounced back.</p>
      <a href="${APP}/dashboard" style="display:inline-block;background:#15264b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9px;font-weight:600">Finish this claim</a>`),
    text: `Your ClearClaim claim for ${item} is missing: ${missing.join("; ")}. Finish it at ${APP}/dashboard`,
  };
}

export function deadlineEmail(daysLeft, endDate) {
  return {
    subject: `Reminder: ${daysLeft} days left to submit this year's receipts`,
    html: wrapHtml(`${daysLeft} days left in the current budget year`, `
      <p style="margin:0 0 12px">The current reimbursement budget year ends <b>${esc(endDate)}</b> — about <b>${daysLeft} days</b> from now.</p>
      <p style="margin:0 0 16px">If you have receipts you haven't submitted yet, now's the time. Open ClearClaim to check what's still in draft.</p>
      <a href="${APP}/dashboard" style="display:inline-block;background:#15264b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9px;font-weight:600">Review my claims</a>`),
    text: `About ${daysLeft} days left in the budget year (ends ${endDate}). Check your unsubmitted receipts at ${APP}/dashboard`,
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

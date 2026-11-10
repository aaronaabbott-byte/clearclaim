import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { efaBudgetYear } from "@/lib/rules";
import { sendOnce, missingEmail, deadlineEmail } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs on a schedule (daily). Scans each family's claims and sends at most one
// of each kind of reminder — missing-item and budget-year deadline —
// deduping through notification_log so nothing goes out twice.
//
// Protected by CRON_SECRET: the caller must send Authorization: Bearer <secret>.
// Vercel Cron attaches this automatically when CRON_SECRET is set; a Cloudflare
// Worker or any scheduler can send the same header.

const DEADLINE_THRESHOLDS = [30, 7]; // days before budget-year end

// Allowed if the scheduler sent the CRON_SECRET, OR a signed-in admin is hitting
// it from the browser (so you can run ?dryRun / ?sampleTo tests without a terminal).
async function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.get("authorization") || "") === `Bearer ${secret}`) return true;
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (user && isAdmin(user.email)) return true;
  } catch { /* not signed in */ }
  return false;
}

// Lightweight "what's missing" check for a claim the family marked ready.
function missingBits(claim) {
  const files = Array.isArray(claim.files) ? claim.files : [];
  const kinds = files.map(f => String(f?.kind || "").toLowerCase());
  const miss = [];
  if (!files.length || !kinds.some(k => /receipt|invoice/.test(k))) miss.push("an itemized receipt");
  if (!kinds.some(k => /payment|proof|statement/.test(k))) miss.push("a proof-of-payment screenshot");
  if (!String(claim.reasoning || claim.purpose || "").trim()) miss.push("a short educational-use note");
  return miss;
}

export async function GET(req) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role not configured" }, { status: 500 });

  // Safety valves for testing without emailing real families:
  //   ?dryRun=1          -> counts what WOULD send; sends nothing, logs nothing.
  //   ?sampleTo=you@x.com -> sends ONE of each kind to that address only; nothing
  //                          is written to notification_log, so the real run later
  //                          is unaffected. Subjects are prefixed [TEST].
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const sampleTo = url.searchParams.get("sampleTo") || null;
  const sampled = {};

  const summary = { mode: dryRun ? "dryRun" : sampleTo ? "sample" : "live", missing: 0, deadline: 0, skipped: 0, errors: 0, scanned_users: 0 };

  // One delivery path that honors the safety valves.
  async function deliver(kind, opts) {
    if (dryRun) return "would_send";
    if (sampleTo) {
      if (sampled[kind]) return "skipped";       // one sample per kind is enough
      sampled[kind] = true;
      const r = await sendEmail({ to: sampleTo, subject: "[TEST] " + opts.subject, html: opts.html, text: opts.text });
      return r?.error ? "error" : "sent";
    }
    return await sendOnce(admin, { kind, ...opts });
  }
  const tally = (r, k) => { (r === "sent" || r === "would_send") ? summary[k]++ : r === "error" ? summary.errors++ : summary.skipped++; };

  try {
    // Recipients: profile flags + state, joined to auth email.
    const { data: profiles } = await admin
      .from("profiles").select("user_id, contact_email, state, notify_email, notify_deadlines");
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authEmail = new Map((userList?.users || []).map(u => [u.id, u.email]));

    const { data: claims } = await admin
      .from("claims").select("id, user_id, items, vendor, amount, status, outcome, files, reasoning, purpose");
    const byUser = new Map();
    for (const c of claims || []) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
      byUser.get(c.user_id).push(c);
    }

    const by = efaBudgetYear();
    const today = new Date();
    const end = new Date(by.end + "T00:00:00");
    const daysLeft = Math.ceil((end - today) / 86400000);

    for (const p of profiles || []) {
      if (p.notify_email === false) continue;
      const to = p.contact_email || authEmail.get(p.user_id);
      if (!to) { summary.skipped++; continue; }
      summary.scanned_users++;
      const mine = byUser.get(p.user_id) || [];

      for (const c of mine) {
        // Missing something, and the family marked it ready to go. (We deliberately
        // do NOT email on "approved": families enter that outcome themselves, so
        // it would just tell them something they already know.)
        if (String(c.status || "") === "ready") {
          const miss = missingBits(c);
          if (miss.length) {
            const r = await deliver("missing", { userId: p.user_id, refId: c.id, to, meta: { miss }, ...missingEmail(c, miss) });
            tally(r, "missing");
          }
        }
      }

      // 3) Budget-year deadline. The budget-year concept is Arkansas EFA, so only
      // AR accounts get it (blank state defaults to AR, matching the app elsewhere).
      const st = (p.state == null || p.state === "") ? "AR" : String(p.state).toUpperCase();
      if (p.notify_deadlines !== false && st === "AR" && daysLeft >= 0) {
        const threshold = DEADLINE_THRESHOLDS.find(t => daysLeft <= t);
        if (threshold) {
          const r = await deliver("deadline", {
            userId: p.user_id, refId: by.end, dedupeKey: String(threshold), to,
            meta: { daysLeft, threshold }, ...deadlineEmail(daysLeft, by.end),
          });
          tally(r, "deadline");
        }
      }
    }
  } catch (e) {
    await logError("cron/notifications", e);
    return NextResponse.json({ error: "scan failed", detail: e?.message, summary }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), summary });
}

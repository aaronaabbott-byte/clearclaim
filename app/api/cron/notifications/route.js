import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { efaBudgetYear } from "@/lib/rules";
import { sendOnce, approvedEmail, missingEmail, deadlineEmail } from "@/lib/notify";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs on a schedule (daily). Scans each family's claims and sends at most one
// of each kind of reminder — approved, missing-item, and budget-year deadline —
// deduping through notification_log so nothing goes out twice.
//
// Protected by CRON_SECRET: the caller must send Authorization: Bearer <secret>.
// Vercel Cron attaches this automatically when CRON_SECRET is set; a Cloudflare
// Worker or any scheduler can send the same header.

const DEADLINE_THRESHOLDS = [30, 7]; // days before budget-year end

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — no secret set, no cron
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
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
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role not configured" }, { status: 500 });

  const summary = { approved: 0, missing: 0, deadline: 0, skipped: 0, errors: 0, scanned_users: 0 };
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
        // 1) Approved
        if (String(c.outcome || "").toLowerCase() === "approved") {
          const t = approvedEmail(c);
          const r = await sendOnce(admin, { userId: p.user_id, kind: "approved", refId: c.id, to, ...t });
          r === "sent" ? summary.approved++ : r === "error" ? summary.errors++ : summary.skipped++;
        }
        // 2) Missing something, and the family marked it ready to go
        if (String(c.status || "") === "ready") {
          const miss = missingBits(c);
          if (miss.length) {
            const t = missingEmail(c, miss);
            const r = await sendOnce(admin, { userId: p.user_id, kind: "missing", refId: c.id, to, meta: { miss }, ...t });
            r === "sent" ? summary.missing++ : r === "error" ? summary.errors++ : summary.skipped++;
          }
        }
      }

      // 3) Budget-year deadline. The budget-year concept is Arkansas EFA, so only
      // AR accounts get it (blank state defaults to AR, matching the app elsewhere).
      const st = (p.state == null || p.state === "") ? "AR" : String(p.state).toUpperCase();
      if (p.notify_deadlines !== false && st === "AR" && daysLeft >= 0) {
        const threshold = DEADLINE_THRESHOLDS.find(t => daysLeft <= t);
        if (threshold) {
          const t = deadlineEmail(daysLeft, by.end);
          const r = await sendOnce(admin, {
            userId: p.user_id, kind: "deadline", refId: by.end, dedupeKey: String(threshold), to,
            meta: { daysLeft, threshold }, ...t,
          });
          r === "sent" ? summary.deadline++ : r === "error" ? summary.errors++ : summary.skipped++;
        }
      }
    }
  } catch (e) {
    await logError("cron/notifications", e);
    return NextResponse.json({ error: "scan failed", detail: e?.message, summary }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), summary });
}

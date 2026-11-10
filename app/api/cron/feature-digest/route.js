import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, wrapHtml } from "@/lib/email";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly roundup of feature gaps for the admins: what's new or growing since the
// last digest. Noise control: only open/planned requests, only those that moved
// (new, or more hits) since last_digested_at, ordered by count.
//
// Protected by CRON_SECRET (Authorization: Bearer <secret>).

const MIN_COUNT = 1; // a single clear request still counts; raise to dampen

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role not configured" }, { status: 500 });

  try {
    const { data: rows } = await admin.from("feature_requests")
      .select("*").in("status", ["open", "planned"]).order("count", { ascending: false }).limit(100);

    // Only surface what's actually moved since we last emailed about it.
    const fresh = (rows || []).filter(r =>
      r.count >= MIN_COUNT && (!r.last_digested_at || new Date(r.last_seen) > new Date(r.last_digested_at)));

    if (!fresh.length) return NextResponse.json({ ok: true, sent: false, reason: "nothing new" });

    const admins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!admins.length) return NextResponse.json({ ok: true, sent: false, reason: "no admin emails" });

    const rowsHtml = fresh.map(r => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eef1f7;font-weight:700">${r.count}×</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eef1f7">${esc(r.title || "")}
          <span style="color:#8792a8;font-size:12px">(${esc(label(r.trigger))} · ${esc((r.states || []).join(", "))})</span></td>
      </tr>`).join("");
    const html = wrapHtml("This week's feature requests", `
      <p style="margin:0 0 12px">${fresh.length} gap${fresh.length > 1 ? "s" : ""} families hit, new or growing since the last digest:</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px"><tbody>${rowsHtml}</tbody></table>
      <p style="margin:16px 0 0"><a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://clearclaimapp.com")}/admin/requests" style="display:inline-block;background:#15264b;color:#fff;text-decoration:none;padding:9px 16px;border-radius:9px;font-weight:600">Open requests panel</a></p>`);
    await sendEmail({ to: admins, subject: `ClearClaim: ${fresh.length} feature request${fresh.length > 1 ? "s" : ""} this week`, html });

    const now = new Date().toISOString();
    await admin.from("feature_requests").update({ last_digested_at: now }).in("signature", fresh.map(r => r.signature));
    return NextResponse.json({ ok: true, sent: true, count: fresh.length });
  } catch (e) {
    await logError("cron/feature-digest", e);
    return NextResponse.json({ error: "digest failed", detail: e?.message }, { status: 500 });
  }
}

function label(t) {
  return ({ ann_unanswered: "Ann couldn't answer", denial_unmapped: "unrecognized denial", user_request: "family request", unsupported: "unsupported" })[t] || t;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

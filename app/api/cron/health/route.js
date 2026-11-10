import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, wrapHtml } from "@/lib/email";
import { SAFE_FIXES } from "@/lib/safefixes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs frequently (every ~20 min). Reads recent error_events, groups them by
// signature, keeps error_clusters up to date, applies ONLY allow-listed safe
// fixes, and emails you a digest of anything recurring that still needs you.
//
// Nothing here touches code, schema, rule logic, money, or user data — those are
// never auto-fixed. See lib/safefixes.js for the (deliberately tiny) allow-list.
//
// Protected by CRON_SECRET (Authorization: Bearer <secret>).

const WINDOW_MIN = 60;       // look back this far for "recurring"
const RECURRING_AT = 3;      // this many in the window = worth flagging
const REALERT_HOURS = 6;     // don't re-email the same open cluster more often

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role not configured" }, { status: 500 });

  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const out = { clusters: 0, recurring: 0, auto_fixed: 0, needs_approval: 0, alerted: false };

  const { data: events } = await admin
    .from("error_events").select("signature, source, message, severity, context, created_at")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(2000);

  // Group by signature.
  const groups = new Map();
  for (const e of events || []) {
    const g = groups.get(e.signature) || { signature: e.signature, count: 0, source: e.source, sample: e, last: e.created_at };
    g.count++;
    groups.set(e.signature, g);
  }
  out.clusters = groups.size;

  const needAttention = []; // clusters that still need Aaron
  for (const g of groups.values()) {
    const recurring = g.count >= RECURRING_AT;
    if (recurring) out.recurring++;

    // Try a safe, allow-listed fix. Everything else waits for approval.
    let autoFix = null;
    const fix = SAFE_FIXES.find(f => f.match(g));
    if (fix) {
      try {
        const applied = await fix.apply(admin, g);
        if (applied) { autoFix = fix.name; out.auto_fixed++; }
      } catch { /* a failed auto-fix just means it stays flagged */ }
    }

    // Upsert the cluster triage row.
    const { data: prev } = await admin
      .from("error_clusters").select("status, last_alerted_at, first_seen").eq("signature", g.signature).maybeSingle();
    const status = autoFix ? "auto_fixed" : (prev?.status && prev.status !== "open" ? prev.status : "open");
    await admin.from("error_clusters").upsert({
      signature: g.signature,
      first_seen: prev?.first_seen || g.sample.created_at,
      last_seen: g.last,
      count: g.count,
      source: g.source,
      sample_message: String(g.sample?.message || "").slice(0, 400),
      sample_context: g.sample?.context || {},
      status,
      auto_fix: autoFix,
      needs_approval: !autoFix,
    }, { onConflict: "signature" });

    // Flag for the digest: recurring, not auto-fixed, not already acknowledged,
    // and not re-alerted too recently.
    const staleAlert = !prev?.last_alerted_at || (Date.now() - new Date(prev.last_alerted_at)) > REALERT_HOURS * 3600000;
    if (recurring && !autoFix && status === "open" && staleAlert) {
      needAttention.push(g);
      out.needs_approval++;
    }
  }

  // One digest email to the admins for everything that needs a human.
  if (needAttention.length) {
    const admins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (admins.length) {
      const rows = needAttention.map(g => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eef1f7"><b>${esc(g.source || "app")}</b></td>
          <td style="padding:6px 10px;border-bottom:1px solid #eef1f7">${g.count}×</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eef1f7;color:#5b667d">${esc(String(g.sample?.message || "").slice(0, 120))}</td>
        </tr>`).join("");
      const html = wrapHtml("ClearClaim health: errors need a look", `
        <p style="margin:0 0 12px">${needAttention.length} recurring error${needAttention.length > 1 ? "s" : ""} in the last ${WINDOW_MIN} min that I didn't auto-fix (safe fixes run on their own; these need your call):</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px"><tbody>${rows}</tbody></table>
        <p style="margin:16px 0 0"><a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://clearclaimapp.com")}/admin/health" style="display:inline-block;background:#15264b;color:#fff;text-decoration:none;padding:9px 16px;border-radius:9px;font-weight:600">Open health panel</a></p>`);
      await sendEmail({ to: admins, subject: `ClearClaim: ${needAttention.length} recurring error${needAttention.length > 1 ? "s" : ""} need review`, html });
      out.alerted = true;
      const sigs = needAttention.map(g => g.signature);
      await admin.from("error_clusters").update({ last_alerted_at: new Date().toISOString() }).in("signature", sigs);
    }
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), ...out });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

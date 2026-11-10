// Lightweight error capture. Call logError() from any catch block; it writes a
// row to error_events via the service role. It NEVER throws — logging must not
// break the request it's logging. The health cron (/api/cron/health) reads these
// rows, groups them by signature, and surfaces recurring ones.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Normalize a message so the same bug with different ids/numbers collapses to
// one signature: strip uuids, long numbers, quotes, and timestamps.
function normalize(msg) {
  return String(msg || "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/\d{4}-\d{2}-\d{2}t[\d:.]+z?/gi, "<ts>")
    .replace(/\b\d{3,}\b/g, "<n>")
    .replace(/["'`]/g, "")
    .trim()
    .slice(0, 400);
}

export function errorSignature(source, msg) {
  const basis = `${source || "app"}::${normalize(msg)}`;
  return crypto.createHash("sha1").update(basis).digest("hex").slice(0, 16);
}

export async function logError(source, err, context = {}) {
  try {
    const admin = createAdminClient();
    if (!admin) return; // service role not configured — nothing to write to
    const message = normalize(err?.message || err);
    const severity = context.severity || "error";
    await admin.from("error_events").insert({
      signature: errorSignature(source, message),
      source: String(source || "app").slice(0, 80),
      message,
      severity,
      user_id: context.userId || null,
      context: sanitize(context),
    });
  } catch {
    // Swallow — logging failures must never propagate.
  }
}

// Keep obviously sensitive keys out of the stored context.
function sanitize(ctx) {
  const out = {};
  for (const [k, v] of Object.entries(ctx || {})) {
    if (/password|token|secret|key|authorization|card|ssn/i.test(k)) continue;
    if (k === "userId" || k === "severity") continue;
    out[k] = typeof v === "string" ? v.slice(0, 300) : v;
  }
  return out;
}

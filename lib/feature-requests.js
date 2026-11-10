// Capture a "the app couldn't do this" signal and cluster it so it doesn't
// become noise. Similar signals collapse onto one feature_requests row by
// signature, with a running count, a few verbatim samples, and state breakdown.
// Never throws — capturing a gap must not break the request it came from.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_SAMPLES = 5;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, " ")
    .replace(/\d+/g, " ")            // numbers rarely define the ask
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ").slice(0, 24).join(" "); // first ~24 words carry the intent
}

function signatureFor(trigger, text) {
  return crypto.createHash("sha1").update(`${trigger}::${normalize(text)}`).digest("hex").slice(0, 16);
}

// Don't record empty or trivially short asks.
function tooThin(text) {
  return normalize(text).split(" ").filter(Boolean).length < 3;
}

export async function captureFeatureRequest({ trigger, text, state, userId }) {
  try {
    if (!trigger || tooThin(text)) return;
    const admin = createAdminClient();
    if (!admin) return;

    const sig = signatureFor(trigger, text);
    const st = (state == null || state === "") ? "AR" : String(state).toUpperCase();
    const userHash = userId ? crypto.createHash("sha1").update(String(userId)).digest("hex").slice(0, 12) : null;
    const sample = { text: String(text).slice(0, 400), user_hash: userHash, at: new Date().toISOString() };
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from("feature_requests").select("count, states, samples, status").eq("signature", sig).maybeSingle();

    if (existing) {
      // A shipped/dismissed ask that's recurring again reopens, so you see it.
      const status = (existing.status === "shipped" || existing.status === "dismissed") ? "open" : existing.status;
      const states = Array.from(new Set([...(existing.states || []), st]));
      const samples = [sample, ...(Array.isArray(existing.samples) ? existing.samples : [])].slice(0, MAX_SAMPLES);
      await admin.from("feature_requests").update({
        count: (existing.count || 0) + 1, states, samples, status, last_seen: now,
      }).eq("signature", sig);
    } else {
      await admin.from("feature_requests").insert({
        signature: sig, trigger, title: String(text).slice(0, 120),
        count: 1, states: [st], samples: [sample], status: "open", first_seen: now, last_seen: now,
      });
    }
  } catch {
    // Swallow — never let capture break the caller.
  }
}

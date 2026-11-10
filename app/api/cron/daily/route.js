import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Single daily entry point, so the whole suite fits Vercel Hobby's 2-cron /
// once-per-day limit. It runs the notifications scan and the health check every
// day, and the feature-request digest once a week (Mondays). Each sub-job stays
// a normal route you can also curl on its own.
//
// Protected by CRON_SECRET (Authorization: Bearer <secret>).

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const origin = new URL(req.url).origin;
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
  const out = {};

  async function hit(path) {
    try {
      const r = await fetch(origin + path, { headers, cache: "no-store" });
      return await r.json().catch(() => ({ status: r.status }));
    } catch (e) { return { error: e?.message || "failed" }; }
  }

  out.notifications = await hit("/api/cron/notifications");
  out.health = await hit("/api/cron/health");
  // Weekly digest: only on Mondays (UTC).
  if (new Date().getUTCDay() === 1) out.featureDigest = await hit("/api/cron/feature-digest");

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), ...out });
}

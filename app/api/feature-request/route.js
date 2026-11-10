import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureFeatureRequest } from "@/lib/feature-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Explicit user-submitted gap: an "Ann didn't help" thumbs-down, or a "request a
// feature" box. Same clustering/dedupe as the automatic captures. Authenticated,
// so it can't be spammed anonymously.
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").slice(0, 600);
  const trigger = body?.trigger === "unsupported" ? "unsupported" : "user_request";
  if (!text.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  await captureFeatureRequest({ trigger, text, state: prof?.state, userId: user.id });
  return NextResponse.json({ ok: true });
}

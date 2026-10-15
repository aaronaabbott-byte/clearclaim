import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build the branded base URL (the apex domain, never the app. subdomain) from
// the incoming request, so links read https://clearclaimapp.com/d/<token>.
function brandedBase(req) {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const host = (req.headers.get("host") || "clearclaimapp.com").replace(/^app\./, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

// POST { action: "create", path, name?, kind? }  -> { url, token }
// POST { action: "revoke", token }               -> { ok: true }
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const action = body?.action || "create";

  if (action === "revoke") {
    const token = String(body?.token || "");
    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
    // RLS restricts this to the caller's own tokens.
    const { error } = await supabase.from("share_tokens").update({ revoked: true }).eq("token", token).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // create
  const path = String(body?.path || "");
  if (!path) return NextResponse.json({ error: "Missing path." }, { status: 400 });
  // The file must live in the caller's own folder: paths are {user_id}/...
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "That file isn't yours to share." }, { status: 403 });
  }

  // Reuse an existing live link for this file so one file = one stable link.
  const { data: existing } = await supabase
    .from("share_tokens")
    .select("token")
    .eq("user_id", user.id)
    .eq("path", path)
    .eq("revoked", false)
    .limit(1)
    .maybeSingle();

  let token = existing?.token;
  if (!token) {
    token = crypto.randomBytes(12).toString("base64url"); // 16 unguessable chars
    const { error } = await supabase.from("share_tokens").insert({
      token,
      user_id: user.id,
      path,
      name: body?.name ? String(body.name).slice(0, 200) : null,
      kind: body?.kind ? String(body.kind).slice(0, 80) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token, url: `${brandedBase(req)}/d/${token}` });
}

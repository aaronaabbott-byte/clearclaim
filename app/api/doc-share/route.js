import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function brandedBase(req) {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const host = (req.headers.get("host") || "clearclaimapp.com").replace(/^app\./, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

// POST { action:"create", kind:"invoice"|"document", refId }  -> { url, token }
// POST { action:"revoke", token }                              -> { ok:true }
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }

  if (body?.action === "revoke") {
    const token = String(body?.token || "");
    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
    const { error } = await supabase.from("doc_shares").update({ revoked: true }).eq("token", token).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const kind = body?.kind === "document" ? "document" : "invoice";
  const refId = String(body?.refId || "");
  if (!refId) return NextResponse.json({ error: "Missing record." }, { status: 400 });

  // Confirm the record is the caller's own (RLS scopes these selects to them).
  const table = kind === "document" ? "syllabi" : "invoices";
  const { data: rec } = await supabase.from(table).select("id").eq("id", refId).maybeSingle();
  if (!rec) return NextResponse.json({ error: "That record isn't yours to share." }, { status: 403 });

  // Reuse an existing live link for this record.
  const { data: existing } = await supabase.from("doc_shares")
    .select("token").eq("user_id", user.id).eq("kind", kind).eq("ref_id", refId).eq("revoked", false).limit(1).maybeSingle();

  let token = existing?.token;
  if (!token) {
    token = crypto.randomBytes(12).toString("base64url");
    const { error } = await supabase.from("doc_shares").insert({ token, user_id: user.id, kind, ref_id: refId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ token, url: `${brandedBase(req)}/v/${token}` });
}

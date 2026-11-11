import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Reads a photo of a receipt with the vision model and returns structured fields
// to prefill a claim. Family-plan feature. The image arrives already downscaled
// by the browser, so bodies stay small.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  if (!planFrom(ent).family) return NextResponse.json({ premium: true }, { status: 402 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Scanning isn't set up on this server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const data = String(body?.imageBase64 || "");
  let mediaType = String(body?.mediaType || "image/jpeg");
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) mediaType = "image/jpeg";
  if (data.length < 100) return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (data.length > 7_000_000) return NextResponse.json({ error: "That image is too large — try again." }, { status: 413 });

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const system = `You read a photo of a purchase receipt and extract fields for a reimbursement claim. Return ONLY minified JSON with keys: vendor (the store or merchant name), date (purchase date as YYYY-MM-DD, or ""), amount (the final total the customer actually paid, a number with no currency symbol, or ""), items (a short comma-separated list of the main items purchased, or ""). Do NOT invent anything that isn't visible. If a field is unreadable, use "". No markdown, no extra keys.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: 400, system,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: "Extract the receipt fields as JSON." },
        ] }],
      }),
    });
    if (!r.ok) return NextResponse.json({ error: `scan_${r.status}` }, { status: 502 });
    const j = await r.json();
    let text = (j?.content?.[0]?.text || "").trim().replace(/^```[a-z]*\n?|```$/g, "").trim();
    let out;
    try { out = JSON.parse(text); } catch { return NextResponse.json({ error: "Couldn't read that receipt — enter the details by hand." }, { status: 422 }); }
    return NextResponse.json({
      vendor: String(out.vendor || "").slice(0, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(out.date || "") ? out.date : "",
      amount: (out.amount === 0 || out.amount) ? String(out.amount).replace(/[^0-9.]/g, "") : "",
      items: String(out.items || "").slice(0, 300),
    });
  } catch (e) {
    await logError("api/scan-receipt", e);
    return NextResponse.json({ error: "Scanning failed — enter the details by hand." }, { status: 500 });
  }
}

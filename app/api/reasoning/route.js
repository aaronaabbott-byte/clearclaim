import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftReasoning } from "@/lib/rules";
import { planFrom } from "@/lib/plan";

// Generates an educational-use justification with Claude. The API key lives only
// on the server (ANTHROPIC_API_KEY) and is never exposed to the browser. If no
// key is configured or the call fails, we return the smart template as a fallback.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ text: null, error: "unauthorized" }, { status: 401 });

  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  if (!planFrom(ent).family) return NextResponse.json({ text: null, premium: true });

  const { claim = {}, kid = {} } = await request.json().catch(() => ({}));
  const fallback = draftReasoning(claim, kid);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ text: null, fallback, reason: "no-key" });

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const prompt =
`You write the "educational-use justification" a parent submits with an Arkansas EFA education-fund reimbursement.
Write 2 to 4 short, concrete, first-person sentences explaining how THIS student uses THESE specific items in THEIR classes.
Rules: be specific and factual; name the items and the course/subject where natural; do NOT write a generic "benefits of X" essay; do not list benefits; no marketing language, no headings, no bullet points. Plain sentences only. Do NOT assume the student's gender — never use "he", "she", "him", or "her"; use the student's first name or "the student" instead. Return ONLY the justification text.

Student: ${kid.first_name || "(unnamed)"}${kid.grade ? `, grade ${kid.grade}` : ""}${kid.setting === "homeschool" ? ", homeschooled" : kid.school_name ? `, at ${kid.school_name}` : ""}${kid.subjects ? `. Subjects this year: ${kid.subjects}.` : "."}
Purchase category: ${claim.category || "(none)"}. Store/vendor: ${claim.vendor || "(unknown)"}. Amount: $${claim.amount || "?"}.
Items: ${claim.items || "(not itemized)"}.
Parent's note (optional context): ${claim.purpose || "(none)"}.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      return NextResponse.json({ text: null, fallback, error: `api_${r.status}` });
    }
    const data = await r.json();
    const text = (data?.content?.[0]?.text || "").trim();
    return NextResponse.json({ text: text || null, fallback });
  } catch (e) {
    return NextResponse.json({ text: null, fallback, error: String(e?.message || e) });
  }
}

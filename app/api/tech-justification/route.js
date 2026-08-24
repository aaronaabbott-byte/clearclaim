import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CRITERIA, CRITERIA_IDS } from "@/lib/preapproval";
import { localTechJustification } from "@/lib/technology";
import { planFrom } from "@/lib/plan";

function systemPrompt() {
  const list = CRITERIA.map(c => `  ${c.id} (${c.group}): ${c.name} — ${c.plain}`).join("\n");
  return `You write the "why is this necessary" justification a parent submits on the Arkansas EFA Expense Preapproval Request (a Google Form) for a TECHNOLOGY device. Technology has a per-device necessity expectation on top of a $1,000 aggregate cap, so a strong device justification does more than the general one. Cover ALL seven criteria:
${list}

Also cover the technology-specific elements:
- Device specificity: why this particular kind of device, versus a cheaper or general alternative.
- Existing-device gap: use ONLY the limitation the parent actually described. If they described none, insert the literal placeholder "[describe what your current device cannot do]" and do NOT invent, guess, or embellish a limitation.
- Platform requirement: include a required program or platform ONLY if the parent named one, and reference their stated source. Do not invent software requirements.
- Prior-year technology: if the parent listed prior EFA technology for this student, acknowledge it and explain plainly why this request does not duplicate it. If none listed, say nothing about prior purchases.

HARD RULES (do not break these):
- Never mention, ask about, hint at, or imply that a disability, diagnosis, or medical condition would help the request. Never suggest the parent add one.
- If, and only if, the parent's own notes volunteer a clinical accommodation or disability need, you may reference it accurately in their words and note it is a clinician-specified accommodation. Never add medical detail they did not provide.
- Never predict or imply approval odds. This is a justification draft, not a prediction.

Style: 5 to 8 plain, specific sentences in the parent's first person, grounded in the actual device and student. No headings, no labels, no filler. Also produce a SHORT description for the form's brief-description field: one to three words (like "laptop"). Never a sentence.

Return ONLY minified JSON with keys: field5 (short description), justification (full text), covered (array of criteria ids you genuinely addressed, from: ${CRITERIA_IDS.join(", ")}). No markdown, no extra keys.`;
}

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  if (!planFrom(ent).family) return NextResponse.json({ premium: true }, { status: 402 });

  const body = await request.json().catch(() => ({}));
  const input = {
    description: (body.description || "").slice(0, 500),
    students: (body.students || "").slice(0, 300),
    grade: (body.grade || "").slice(0, 40),
    cost: (body.cost || "").toString().slice(0, 40),
    existingGap: (body.existingGap || "").slice(0, 800),
    platform: (body.platform || "").slice(0, 200),
    platformSource: (body.platformSource || "").slice(0, 300),
    priorTech: (body.priorTech || "").slice(0, 600),
    notes: (body.notes || "").slice(0, 800),
  };
  const fallback = localTechJustification(input);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !input.description.trim()) {
    return NextResponse.json({ ...fallback, source: key ? "template" : "no-key" });
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
    const prompt = [
      `Device: ${input.description}`,
      `Student(s): ${input.students || "(not given)"}${input.grade ? `, grade ${input.grade}` : ""}`,
      `Item price: ${input.cost || "(not given)"}`,
      `Existing-device gap the parent described: ${input.existingGap || "(none provided)"}`,
      `Required platform/software (only if named): ${input.platform || "(none)"}${input.platformSource ? ` — source: ${input.platformSource}` : ""}`,
      `Prior EFA technology for this student: ${input.priorTech || "(none listed)"}`,
      `Parent notes: ${input.notes || "(none)"}`,
    ].join("\n");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1000, system: systemPrompt(), messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return NextResponse.json({ ...fallback, source: "template" });
    const data = await r.json();
    const raw = (data?.content?.[0]?.text || "").trim();
    let parsed = null;
    try { parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch {}
    if (!parsed || !parsed.justification) return NextResponse.json({ ...fallback, source: "template" });
    const covered = Array.isArray(parsed.covered) ? parsed.covered.filter(c => CRITERIA_IDS.includes(c)) : [];
    const field5 = (parsed.field5 || fallback.field5).toString().split(/\s+/).slice(0, 4).join(" ");
    return NextResponse.json({ field5, justification: parsed.justification.trim(), covered, source: "ai" });
  } catch {
    return NextResponse.json({ ...fallback, source: "template" });
  }
}

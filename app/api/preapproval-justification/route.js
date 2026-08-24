import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CRITERIA, CRITERIA_IDS, localJustificationDraft } from "@/lib/preapproval";
import { planFrom } from "@/lib/plan";

function systemPrompt() {
  const list = CRITERIA.map(c => `  ${c.id} (${c.group}): ${c.name} — ${c.plain}`).join("\n");
  return `You write the "why is this necessary" justification a parent submits on the Arkansas EFA Expense Preapproval Request (a Google Form). Reviewers apply the full ordinary-and-necessary standard even though the form under-asks, so cover ALL seven criteria:
${list}

Rules:
- Write 4 to 7 plain, specific sentences in the parent's first person. Ground it in the actual item and the student. No "benefits of X" essay, no filler, no headings.
- Address every one of the seven criteria that you honestly can, and weave them in naturally rather than labeling them.
- Future readiness is the one parents miss, especially for young students. Do NOT overreach. For a young child, connect to foundational skills (early literacy, numeracy, fine motor, curiosity) that later coursework, training, or work build on.
- If the item could read as recreational or hobby-based, explicitly establish that it is part of a structured instructional program with a clear academic or career objective, so it is not excluded as recreational.
- Also produce a SHORT description for the form's separate brief-description field: one to three words (like "laptop" or "violin"). Never a sentence.

Return ONLY minified JSON with keys: field5 (the short description), justification (the full text), covered (array of the criteria ids you genuinely addressed, from: ${CRITERIA_IDS.join(", ")}). No markdown, no extra keys.`;
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
    notes: (body.notes || "").slice(0, 800),
  };
  const fallback = localJustificationDraft(input);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !input.description.trim()) {
    return NextResponse.json({ ...fallback, source: key ? "template" : "no-key" });
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
    const prompt = `Item: ${input.description}\nStudent(s): ${input.students || "(not given)"}${input.grade ? `, grade ${input.grade}` : ""}\nItem price: ${input.cost || "(not given)"}\nParent notes: ${input.notes || "(none)"}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 900, system: systemPrompt(), messages: [{ role: "user", content: prompt }] }),
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

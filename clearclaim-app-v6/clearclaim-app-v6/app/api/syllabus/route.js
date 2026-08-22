import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localSyllabusDraft } from "@/lib/syllabus";

// Drafts a full course syllabus. Returns structured fields the builder fills in.
// Uses Claude when ANTHROPIC_API_KEY is set (server-only); otherwise a template.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ draft: null, error: "unauthorized" }, { status: 401 });

  const { input = {}, kid = {} } = await request.json().catch(() => ({}));
  const fallback = localSyllabusDraft(input);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ draft: fallback, source: "template", reason: "no-key" });

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const prompt =
`You are helping a homeschool parent write a real course syllabus that documents educational use for an Arkansas EFA education-fund review.
Produce a specific, credible syllabus for the course below. Ground it in the grade level and the listed materials. Objectives must be measurable; the schedule should be a realistic term-long plan; assessment must explain how progress is graded.

Return ONLY valid minified JSON with exactly these string keys: description, objectives, standards, materials, schedule, assessment.
Use "\\n" for line breaks inside a value. No markdown, no commentary, no extra keys.

Course title: ${input.title || "(none)"}
Subject: ${input.subject || "(none)"}
Grade: ${input.grade || kid.grade || "(none)"}
Level: ${input.level || "(none)"}
Length: ${input.weeks ? `${input.weeks} weeks` : "(one term)"}, ${input.sessions_per_week ? `${input.sessions_per_week} session(s)/week` : "(cadence unspecified)"}
Term: ${input.term || "(current year)"}
Student: ${kid.first_name || "the student"}${kid.setting === "homeschool" ? " (homeschool)" : kid.school_name ? ` (${kid.school_name})` : ""}
Curriculum / materials the parent is using: ${input.materials || "(not specified — suggest suitable ones)"}
Extra notes: ${input.notes || "(none)"}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1400, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return NextResponse.json({ draft: fallback, source: "template", error: `api_${r.status}` });
    const data = await r.json();
    const raw = (data?.content?.[0]?.text || "").trim();
    let parsed = null;
    try {
      const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      parsed = JSON.parse(jsonStr);
    } catch { parsed = null; }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ draft: fallback, source: "template", error: "parse" });
    }
    const draft = {
      description: parsed.description || fallback.description,
      objectives: parsed.objectives || fallback.objectives,
      standards: parsed.standards || fallback.standards,
      materials: parsed.materials || input.materials || fallback.materials,
      schedule: parsed.schedule || fallback.schedule,
      assessment: parsed.assessment || fallback.assessment,
    };
    return NextResponse.json({ draft, source: "ai" });
  } catch (e) {
    return NextResponse.json({ draft: fallback, source: "template", error: String(e?.message || e) });
  }
}

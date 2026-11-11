import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COCURRICULAR, EXTRACURRICULAR } from "@/lib/rules";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Writes a submission justification for a co-curricular course OR an
// extracurricular activity, grounded in the official Arkansas checklist the
// family worked through. It only argues the requirements the family actually
// checked, lists the documents to attach, and never invents facts or caps.

function setFor(type) {
  return type === "extracurricular"
    ? { data: EXTRACURRICULAR, label: "extracurricular activity", noun: "activity" }
    : { data: COCURRICULAR, label: "co-curricular course", noun: "course" };
}

// Offline fallback so it works without an API key.
function templateJustification({ label, noun, name, provider, met, missing, cap }) {
  const subject = name || `this ${noun}`;
  const lines = [];
  lines.push(`${subject}${provider ? `, offered by ${provider},` : ""} qualifies as a ${label} under Arkansas EFA rules (6 CAR § 35-102) and meets the ordinary-and-necessary standard (§ 35-114, § 35-115).`);
  if (met.length) {
    lines.push("");
    lines.push("It meets the program's requirements:");
    met.forEach(r => lines.push(`- ${r.requirement}.`));
  }
  if (cap) { lines.push(""); lines.push(cap); }
  if (missing.length) {
    lines.push("");
    lines.push(`Not yet documented: ${missing.map(r => r.requirement.toLowerCase()).join("; ")}. Add proof for these before submitting, or this may be a better fit for the other category.`);
  }
  return lines.join("\n");
}

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { data, label, noun } = setFor(body?.type);
  const name = String(body?.name || "").slice(0, 160);
  const provider = String(body?.provider || "").slice(0, 160);
  const notes = String(body?.notes || "").slice(0, 800);
  const checkedIds = Array.isArray(body?.checkedIds) ? body.checkedIds : [];
  const met = data.requirements.filter(r => checkedIds.includes(r.id));
  const missing = data.requirements.filter(r => !checkedIds.includes(r.id));
  const cap = data.capNote || null;
  const docs = met.map(r => r.doc);

  const fallback = () => NextResponse.json({
    justification: templateJustification({ label, noun, name, provider, met, missing, cap }),
    docs, missing: missing.map(r => r.requirement), label, ai: false,
  });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || met.length === 0) return fallback();

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const system = `You write a short, specific justification a parent submits to the Arkansas EFA program to approve a ${label}. Ground it ONLY in the checklist requirements the family marked as met and any details they provide. Do NOT invent facts, dollar amounts, caps, dates, or requirements that were not provided. Do NOT claim a requirement that is not in the met list. Address the met requirements in natural prose (not a checkbox list), tie them to this specific ${noun} where the family gave detail, and cite 6 CAR § 35-102 plus the ordinary-and-necessary standard (§ 35-114, § 35-115) once. Keep it to 120-180 words, plain and confident but not promising approval.${cap ? ` End by noting this cost counts toward the 25% extracurricular/PE/field-trip limit.` : ""} If some requirements are unmet, do not paper over them.`;

  const metList = met.map(r => `- ${r.requirement}`).join("\n");
  const userMsg = `Type: ${label}\n${noun[0].toUpperCase() + noun.slice(1)} name: ${name || "(not given)"}\nProvider: ${provider || "(not given)"}\nRequirements the family has documentation for:\n${metList}\n${missing.length ? `Still missing: ${missing.map(r => r.requirement).join("; ")}\n` : ""}${notes ? `Family's details: ${notes}` : ""}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 420, system, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!r.ok) return fallback();
    const j = await r.json();
    const justification = (j?.content?.[0]?.text || "").trim();
    if (!justification) return fallback();
    return NextResponse.json({ justification, docs, missing: missing.map(r => r.requirement), label, ai: true });
  } catch (e) {
    await logError("api/activity-justification", e);
    return fallback();
  }
}

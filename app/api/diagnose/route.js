import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import { getStateConfig } from "@/lib/states";
import { diagnoseDenial } from "@/lib/denials";

// Diagnose a denied submission. The curated rules engine (lib/denials) does the
// real work; AI is only an assist for oddly-worded reasons the rules didn't
// catch, and it runs under tight guardrails so it can't invent caps or rules.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  const cfg = getStateConfig((prof?.state || "AR").toUpperCase());
  if (!cfg?.features?.denialFixer) return NextResponse.json({ gated: true });

  const body = await request.json().catch(() => ({}));
  const reason = (body.reason || "").toString().slice(0, 2000);
  const claim = { items: (body.items || "").toString().slice(0, 500), category: (body.category || "").toString().slice(0, 120) };

  const result = diagnoseDenial(reason, claim);

  // AI assist only for unclear cases, and only on the Family plan with a key.
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const family = planFrom(ent).family;
  const key = process.env.ANTHROPIC_API_KEY;
  let aiNote = null;
  if (result.unclear && reason.trim() && family && key) {
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
    const system = `You triage a denied Arkansas EFA / ClassWallet reimbursement. Read ONLY the reviewer's denial reason (and the item, if given) and say, in 2-3 plain sentences, whether it reads like (a) a fixable documentation or process problem the parent can correct and resubmit, or (b) the item/expense itself is not reimbursable so resubmitting won't help, or (c) it's unclear and you'd need more info. Do NOT state or invent any specific dollar cap, deadline, or rule number — you don't have them. Never promise approval. Be honest and brief.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 260, system, messages: [{ role: "user", content: `Denial reason: "${reason}"${claim.items ? `\nItem: ${claim.items}` : ""}${claim.category ? `\nCategory: ${claim.category}` : ""}` }] }),
      });
      if (r.ok) { const d = await r.json(); aiNote = (d?.content?.[0]?.text || "").trim() || null; }
    } catch { /* best effort */ }
  }

  return NextResponse.json({ ...result, aiNote, premium: family });
}

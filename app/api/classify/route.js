import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { config, fallbackClassify, validateVerdict, computeAction } from "@/lib/classify";

function systemPrompt() {
  const list = config.coreCategories.map(c => `  ${c.id}: ${c.text}`).join("\n");
  return `You classify a purchase as core or non-core for the Arkansas EFA program under 6 CAR Part 35. You do not decide approval. You do not invent rules.

Core definition (${config.coreDefinition.citation}): ${config.coreDefinition.text}

The core list is CLOSED. These are the only core categories, and each has an id you must cite exactly if you choose "core":
${list}

Rules you must follow:
- Anything not clearly on the list above is non-core (${config.coreClosedList.citation}). Do not stretch a category to fit.
- If a purchase could reasonably be read as either core or non-core, return "ambiguous" and explain honestly what pushes it each way. An honest judgment call is better than a confident wrong answer.
- "core" requires citing one of the ids above verbatim in coreCitation. If you cannot, do not say core.
- Note when the recreational or hobby exclusion may apply (${config.recreationalExclusion.citation}): ${config.recreationalExclusion.text}
- Keep reasoning plain, specific, and short. Cite the subsection you relied on.

Return ONLY minified JSON with these keys: classification ("core" | "non-core" | "ambiguous"), coreCitation (an id from the list, or null), reasoning (string), pushCore (string, what would make it core, or ""), pushNonCore (string, what would make it non-core, or ""). No markdown, no extra keys.`;
}

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const description = (body.description || "").toString().slice(0, 2000);
  const purchaseStatus = body.purchaseStatus === "bought" ? "bought" : "planned";
  const purchaseDate = body.purchaseDate || null;
  const firstProgramYear = body.firstProgramYear || null;

  let verdict;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !description.trim()) {
    verdict = fallbackClassify(description);
    if (!key) verdict.note = "Automated classifier is running in basic mode (no AI key). This is a keyword match, not a full reading.";
  } else {
    try {
      const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 600, system: systemPrompt(),
          messages: [{ role: "user", content: `Classify this: "${description}"` }],
        }),
      });
      if (!r.ok) { verdict = fallbackClassify(description); }
      else {
        const data = await r.json();
        const raw = (data?.content?.[0]?.text || "").trim();
        let parsed = null;
        try { parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch {}
        verdict = parsed ? validateVerdict(parsed) : fallbackClassify(description);
      }
    } catch {
      verdict = fallbackClassify(description);
    }
  }

  const action = computeAction({
    classification: verdict.classification,
    purchaseStatus, purchaseDate, firstProgramYear, today: new Date(),
  });

  return NextResponse.json({
    verdict, action, purchaseStatus, purchaseDate,
    ruleVersion: config.ruleVersion, ruleShort: config.ruleShort,
  });
}

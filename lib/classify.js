// Core vs non-core classification helpers. All thresholds, dates, and the core
// list come from lib/rule-config.json (the single source of truth for 6 CAR
// Part 35). This file only reads that config and applies date-aware branching.
import config from "./rule-config.json";
import { screenExclusion } from "./exclusions.js";

export { config };

export function coreIds() { return config.coreCategories.map(c => c.id); }

// No-AI fallback. First screen for clearly-excluded items (so shoes, a couch,
// a vacation, etc. get a hard "ineligible" instead of a soft "non-core → proceed").
// Then fall back to the core-list keyword match; anything not on the closed core
// list is non-core per 35-102(4).
export function fallbackClassify(description) {
  const ex = screenExclusion(description);
  if (ex) {
    return {
      classification: "ineligible",
      coreCitation: null,
      exclusionCitation: ex.citation,
      reasoning: `${ex.reason} (${ex.citation})`,
      pushCore: "", pushNonCore: "",
      source: "keyword",
    };
  }
  const hay = (description || "").toLowerCase();
  for (const c of config.coreCategories) {
    if ((c.keywords || []).some(k => hay.includes(k))) {
      return {
        classification: "core",
        coreCitation: c.id,
        reasoning: `Appears to match a core category: ${c.text} (${c.id}). Anything on the core list in 35-102(4) is core.`,
        pushCore: "", pushNonCore: "",
        source: "keyword",
      };
    }
  }
  return {
    classification: "non-core",
    coreCitation: null,
    reasoning: "This does not match any item on the closed core list in 35-102(4), so under the rule it is non-core. It may still be a qualifying non-core expense if it meets the ordinary and necessary criteria (35-114, 35-115).",
    pushCore: "", pushNonCore: "",
    source: "keyword",
  };
}

// Validate an AI verdict against the config so the model can never invent a
// core category. A "core" verdict must cite a real core id.
export function validateVerdict(v) {
  const ids = coreIds();
  const out = {
    classification: ["core", "non-core", "ambiguous", "ineligible"].includes(v.classification) ? v.classification : "ambiguous",
    coreCitation: v.coreCitation || null,
    exclusionCitation: v.exclusionCitation || null,
    reasoning: (v.reasoning || "").trim(),
    pushCore: (v.pushCore || "").trim(),
    pushNonCore: (v.pushNonCore || "").trim(),
    source: "ai",
  };
  if (out.classification === "core" && !ids.includes(out.coreCitation)) {
    out.classification = "ambiguous";
    out.reasoning = (out.reasoning ? out.reasoning + " " : "") +
      "The core determination could not be tied to a specific 35-102(4) subsection, so this is being treated as a judgment call rather than a confirmed core expense.";
  }
  if (out.classification !== "core") out.coreCitation = null;
  return out;
}

// Date-aware branching. `input`: { classification, purchaseStatus ('planned'|'bought'),
// purchaseDate (YYYY-MM-DD|null), firstProgramYear (number|null), today (Date) }.
export function computeAction(input) {
  const { classification } = input;
  const today = input.today || new Date();
  const pa = config.preApproval;
  const eff = pa.effectiveDate ? new Date(pa.effectiveDate + "T00:00:00") : null;
  const effectiveActive = !!(eff && today >= eff);
  const isCore = classification === "core";
  const bought = input.purchaseStatus === "bought";

  // Clearly excluded — say so plainly instead of routing it to "proceed for now."
  if (classification === "ineligible") {
    return {
      phase: "ineligible",
      tone: "stop",
      headline: "Very unlikely to qualify — this looks like an excluded expense.",
      detail: "Under the rule text, this is the kind of purchase that's excluded or doesn't meet the ordinary-and-necessary standard, so it would very likely be denied. ClearClaim isn't the decision-maker, but we'd steer you away from submitting this as-is. If there's a genuine, documented instructional tie — part of a structured program with clear academic or career objectives — it may be worth a pre-approval conversation with the Department before spending.",
      notices: [],
      effectiveActive,
    };
  }

  const notices = [];

  // First-year July 1 floor (only if we know the student's first program year).
  if (bought && input.purchaseDate && input.firstProgramYear) {
    const pd = new Date(input.purchaseDate + "T00:00:00");
    const floor = new Date(`${input.firstProgramYear}-${config.firstYearFloor.monthDay}T00:00:00`);
    if (pd < floor) {
      notices.push({
        tone: "warn",
        text: `In a student's first program year, expenses dated before July 1 cannot be reimbursed (${config.firstYearFloor.citation}). This purchase is dated before that date.`,
      });
    }
  }

  let phase, headline, detail, tone;
  if (isCore) {
    phase = "core";
    tone = "ok";
    headline = "Core expense — proceed normally.";
    detail = "Core educational expenses do not need pre-approval. Continue building your claim.";
  } else {
    // non-core or ambiguous (treat ambiguous with the same caution as non-core)
    if (!effectiveActive) {
      phase = "before";
      tone = "warn";
      headline = "Proceed for now, with a heads-up.";
      detail = `Pre-approval is not required yet. Starting ${pa.effectiveDateLabel}, purchases like this (non-core) are expected to require Department pre-approval before you buy (${pa.citation}). ${pa.agencyStatement}`;
    } else if (!bought) {
      phase = "after_planned";
      tone = "stop";
      headline = "Stop — get pre-approval before you buy.";
      detail = `Non-core expenses now require Department approval before the expense is incurred (${pa.citation}). If you buy first, reimbursement may not be available. Submit a pre-approval request and wait for the Department's decision before purchasing.`;
    } else {
      phase = "after_bought";
      tone = "stop";
      headline = "Already purchased — reimbursement may not be available.";
      detail = `Because this is non-core and was bought after pre-approval took effect, reimbursement may not be available without prior approval (${pa.citation}). We can't promise an outcome either way; the Department decides.`;
    }

    // Backlog warning for past-dated non-core purchases (provisional reading of (e)).
    if (bought) {
      notices.push({
        tone: "warn",
        text: `If you are holding unsubmitted receipts for non-core purchases, the pre-approval requirement is read to apply to expenses SUBMITTED more than ${pa.submissionWindowMonths} months after it takes effect (${pa.citation}). Submitting sooner rather than later is safer. This reading is provisional and set in configuration.`,
      });
    }
  }

  return { phase, headline, detail, tone, notices, effectiveActive };
}

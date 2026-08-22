import form from "./preapproval-form.json";
import config from "./rule-config.json";

export { form };

// The seven-criteria checklist. Names and citations come from the rule config
// (35-114 Ordinary, 35-115 Necessary). Plain descriptions are the parent-facing
// one-liners. This is a stopping signal, never a score or a prediction.
export const CRITERIA = [
  { id: "appropriateness", group: "Ordinary", citation: config.ordinaryCriteria.citation, name: "Appropriateness", plain: "This is the kind of thing normally used for learning." },
  { id: "reasonableness", group: "Ordinary", citation: config.ordinaryCriteria.citation, name: "Reasonableness", plain: "The cost and how often you buy it are typical." },
  { id: "alignment", group: "Ordinary", citation: config.ordinaryCriteria.citation, name: "Alignment", plain: "It fits recognized curriculum or development." },
  { id: "educational_support", group: "Necessary", citation: config.necessaryCriteria.citation, name: "Educational support", plain: "It helps academic learning, growth, or career-readiness." },
  { id: "justification", group: "Necessary", citation: config.necessaryCriteria.citation, name: "Justification", plain: "The value is clear and comparable to other allowed options." },
  { id: "objective_oriented", group: "Necessary", citation: config.necessaryCriteria.citation, name: "Objective-oriented", plain: "It is needed to meet a specific learning goal or milestone." },
  { id: "future_readiness", group: "Necessary", citation: config.necessaryCriteria.citation, name: "Future readiness", plain: "It builds toward enrollment, enlistment, or employment, directly or through foundational skills." },
];
export const CRITERIA_IDS = CRITERIA.map(c => c.id);

// The form asks for the item price. The device cap in the rule is measured
// before tax and shipping, so item price and checkout total can differ.
export const COST_NOTE = "Enter the item price, before tax and shipping. The device cap in the rule is also measured before tax and shipping, so the item price and your checkout total can differ.";

// Build the Google Form prefilled link. ClearClaim never submits; this only
// opens the form filled in for the parent to review.
export function buildPrefillUrl(v) {
  const p = new URLSearchParams();
  p.set("usp", "pp_url");
  if (v.email) p.set(form.emailParam, v.email);
  const map = {
    parentName: v.parentName, reenterEmail: v.email, students: v.students,
    description: v.description, cost: v.cost, justification: v.justification, link: v.link,
  };
  for (const [k, id] of Object.entries(form.entries)) {
    const val = map[k];
    if (val) p.set(id, val);
  }
  return `${form.viewUrl}?${p.toString()}`;
}

// No-AI fallback: a plain draft that names each criterion so the checklist can
// mark them, plus a short field-5 description.
export function localJustificationDraft({ description, students, cost }) {
  const item = (description || "this item").trim();
  const field5 = item.split(/\s+/).slice(0, 3).join(" ");
  const justification =
    `${cap(item)} is used as part of ${who(students)} structured coursework this year, not for recreation. ` +
    `It is the ordinary kind of resource used for learning at this level (appropriateness), its cost and how often it is bought are typical for similar educational purchases (reasonableness), and it fits the curriculum and skills being taught (alignment). ` +
    `It directly supports academic learning and growth (educational support), its value is clear and comparable to other allowed options (justification), and it is needed to meet a specific learning objective this year (objective-oriented). ` +
    `Over time it builds foundational skills that prepare the student for future enrollment, training, or work (future readiness).`;
  return { field5, justification, covered: [...CRITERIA_IDS] };
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function who(students) { return (students && students.trim()) ? `${students.split(",")[0].trim()}'s` : "the student's"; }

// Denial clocks, shown only when the parent marks a request denied. Rendered
// with the rule's literal wording (see the open question on 35-113(a)).
export function denialClocks() {
  return {
    citation: config.denialTimeline.citation,
    wording: config.denialTimeline.wording,
    reevaluationDays: config.denialTimeline.reevaluationDays,
    finalReviewDays: config.denialTimeline.finalReviewDays,
    text: config.denialTimeline.text,
  };
}

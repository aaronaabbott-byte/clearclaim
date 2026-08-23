import config from "./rule-config.json";
import { CRITERIA_IDS } from "./preapproval";

// Technology-specific justification path. All cap values, included/excluded
// lists, and copy come from rule-config.json (caps.technologyAggregate,
// technology, technologyPath). Nothing here interprets or extends the rule.

const TP = config.technologyPath;
const TECHBLOCK = config.technology;

export const TECH_CAP = config.caps.technologyAggregate.amount;
export const TECH_CAP_CITATION = config.caps.technologyAggregate.citation;
export const LIMITATION_CHIPS = TP.limitationChips;
export const PER_DEVICE_REVIEW = TP.perDeviceReview;
export const CAP_EXCEED = TP.capExceedGrounds;
export const TECH_PRIVACY_NOTE = TP.privacyNote;

function has(text, words) {
  const t = (text || "").toLowerCase();
  return words.some(w => t.includes(w));
}

// Classify a free-text item for the technology path.
//   isDevice     — a personal computing device (laptop, tablet, desktop). These
//                  count against the $1,000 aggregate cap and get the full path.
//   isPeripheral — an AV/learning accessory (keyboard, headphones, printer).
//   isExcluded   — a category the rule excludes (TVs, consoles, phones).
//   isTech       — device or peripheral (anything the tech path applies to).
export function detectTech(text) {
  const excluded = has(text, TP.excludedKeywords);
  const device = has(text, TP.deviceKeywords);
  const peripheral = !device && has(text, TP.peripheralKeywords);
  // Also treat anything on the rule's included AV-learning-tools list as tech.
  const includedTool = !device && !peripheral && has(text, TECHBLOCK.includedAvLearningTools.map(s => s.toLowerCase()));
  const isTech = !excluded && (device || peripheral || includedTool);
  return { isTech, isDevice: !excluded && device, isPeripheral: peripheral || includedTool, isExcluded: excluded };
}

// No-AI fallback draft for a technology item. Covers the seven criteria and the
// technology-specific elements. Critically, it never invents an existing-device
// limitation: if the parent did not describe one, it leaves a marked blank.
export function localTechJustification({ description, students, cost, existingGap, platform, platformSource, priorTech }) {
  const item = (description || "this device").trim();
  const field5 = item.split(/\s+/).slice(0, 3).join(" ");
  const owner = (students && students.trim()) ? `${students.split(/[;,]/)[0].trim()}` : "the student";

  const gap = (existingGap || "").trim();
  const gapSentence = gap
    ? `${owner} already has a device, but it cannot meet this need: ${lower(gap)}.`
    : `If ${owner} already has a device, describe here what it cannot do for this coursework: [describe what your current device cannot do].`;

  const platformSentence = (platform || "").trim()
    ? `This purchase is needed to run ${platform.trim()}${(platformSource || "").trim() ? ` (${platformSource.trim()})` : ""}, which the coursework requires.`
    : "";

  const priorSentence = (priorTech || "").trim()
    ? `For reference, prior technology received through EFA for this student: ${priorTech.trim()}. This request does not duplicate those items because it serves a different, specific need described above.`
    : "";

  const justification = [
    `${cap(item)} is used as part of ${owner}'s structured coursework this year, not for recreation.`,
    gapSentence,
    platformSentence,
    `It is the ordinary kind of device used for learning at this level (appropriateness), its cost is typical for a comparable device (reasonableness), and it fits the coursework and skills being taught (alignment).`,
    `It directly supports academic learning (educational support), its value is clear and comparable to other allowed options (justification), and it is needed to meet a specific learning objective this year (objective-oriented).`,
    `It also builds foundational skills that prepare the student for future enrollment, training, or work (future readiness).`,
    priorSentence,
  ].filter(Boolean).join(" ");

  return { field5, justification, covered: [...CRITERIA_IDS] };
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function lower(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

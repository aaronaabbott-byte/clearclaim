// Arkansas EFA state config. For now this composes the existing lib/rules.js
// exports so there is ONE source of truth and zero behavior change — later steps
// can move the raw data in here. `features` are the flags the UI reads to show or
// hide state-specific behavior.
import {
  SETTINGS, PATHWAYS, PATHWAY_FIELDS, CATEGORIES, FUNDING, FUNDING_TIERS,
} from "@/lib/rules";

export const AR = {
  code: "AR",
  name: "Arkansas",
  program: "Education Freedom Account",
  programShort: "EFA",
  platform: "ClassWallet",
  settings: SETTINGS,
  categories: CATEGORIES,
  pathways: PATHWAYS,
  pathwayFields: PATHWAY_FIELDS,
  funding: FUNDING,
  fundingTiers: FUNDING_TIERS,
  // What the account holder must show on documentation (already surfaced in the app).
  docs: {
    receipt: ["Vendor's name", "Student's name (required for services)", "Clear description of the expense", "Itemized prices and a total", "Proof of payment (method, amount)", "Date of payment"],
    invoice: ["Vendor's name", "Student's name (required for services)", "Clear description of the expense", "Itemized prices and a total"],
  },
  // Feature flags — Arkansas keeps everything it has today.
  features: {
    splitReimbursement: true,   // one-per-family capped items must be split
    techCap: true,              // $1,000/student technology cap
    percentCaps: true,          // 25% extracurricular/PE and 25% travel caps
    priceGuidance: true,        // AR price-guidance + non-qualifying lists
    coCurricularChecklist: true,// 6 CAR Part 35 ten-point checklist
    coreNonCore: true,          // the core/non-core eligibility tool (6 CAR) — Arkansas only
    preapprovalTool: true,      // ADE Google-Form pre-approval flow — Arkansas only
    homeschoolCompliance: true, // Notice of Intent / annual survey tracker — Arkansas only
    vendorDirectory: true,      // searchable ClassWallet vendor list — Arkansas only (AR data)
    quarterlyDeadlines: false,
    fundingTiers: true,         // the Succeed tier toggle — Arkansas only
    perStudentAward: false,     // AR uses fixed tiers, not a parent-entered award
    curriculumDoc: false,       // uses the lighter syllabus for now
  },
};

export default AR;

// One source of truth for what each plan includes, so the Upgrade page, the
// post-signup welcome step, the dashboard banner, and the marketing page all
// stay in sync. Prices here are display strings; the real charge is driven by
// the Stripe price IDs in lib/stripe.js.

export const PLAN_PRICE = {
  family: { monthly: "$10", yearly: "$99", per: "/mo — or $99/yr (2 months free)" },
  provider: { monthly: "$19", yearly: "$189", per: "/mo — or $189/yr (2 months free)" },
};

export const FREE_FEATURES = [
  "1 student",
  "Receipt vault — up to 10 receipts",
  "Eligibility check (rules-based)",
  "Claim builder + ClassWallet packets",
  "Document library",
];

export const FAMILY_FEATURES = [
  "Everything in Free, plus:",
  "Ask Ann + AI-drafted use notes",
  "Smart eligibility with reasoning",
  "Unlimited students & receipts",
  "The full pre-approval tool + log",
  "Syllabus builder",
  "Document redaction & annotation",
];

export const PROVIDER_FEATURES = [
  "Branded course documents on your letterhead",
  "Class roster with family contacts",
  "Invoice builder with auto-calculated tax",
  "Saved products & services menu",
];

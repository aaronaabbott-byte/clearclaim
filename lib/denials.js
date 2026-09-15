// Denial → fix diagnosis. A parent pastes the reviewer's denial reason (and,
// optionally, the item/category) and we map it to the likely problem and a
// concrete fix — or tell them honestly when the item was never going to qualify
// so they don't keep resubmitting.
//
// This is a CURATED, rules-based mapping grounded in verified Arkansas EFA /
// ClassWallet guidance already used elsewhere in the app. It does not invent
// rules. When nothing matches, it returns an "unclear" result so the caller can
// fall back to AI assist or general guidance.
//
// verdict levels:
//   "fixable"      — a documentation / process mistake; resubmitting with the fix
//                    has a real shot.
//   "conditional"  — fixable only if a condition is met (e.g. under a cap, on the
//                    approved list); otherwise it won't go through.
//   "ineligible"   — the item/expense itself isn't reimbursable; no amount of
//                    resubmitting will fix it.

const RULES = [
  // ---- Documentation fixes (fixable) ----------------------------------------
  {
    id: "proof_of_payment",
    level: "fixable",
    test: /proof of payment|no proof|secondary proof|show(?:ing)? payment|payment (?:not|isn't) (?:shown|clear)|bank statement|card statement|didn't pay|not paid|paypal/i,
    title: "Missing proof of payment",
    fix: "Add a secondary proof of payment: a screenshot of the bank or card statement showing the exact charge cleared (amount, date, merchant). This is especially required for PayPal. Attach it alongside the receipt and resubmit.",
  },
  {
    id: "zero_balance",
    level: "fixable",
    test: /\$0 balance|zero balance|paid in full|balance due|outstanding balance|not paid in full/i,
    title: "Receipt must show a $0 balance (paid in full)",
    fix: "Upload a receipt that clearly shows the balance is $0 / paid in full. If the last four digits of your card are on it, circle them; if not, add a bank or card screenshot as secondary proof.",
  },
  {
    id: "itemized",
    level: "fixable",
    test: /itemi[sz]ed|not itemi|line item|need(?:s)? (?:an? )?receipt|no receipt|receipt (?:is )?(?:missing|unclear|illegible)|missing (?:store|date|vendor)|order summary/i,
    title: "Receipt isn't itemized / is missing details",
    fix: "Attach a fully itemized receipt that shows the store name, the date, each item with its price, a total, and the payment method. An order-confirmation email or the vendor's itemized invoice works. Blurry photos get rejected — make sure it's legible.",
  },
  {
    id: "course_curriculum",
    level: "fixable",
    test: /resubmit with course|course taking|curriculum|educational (?:use|purpose|tie)|how (?:it|this) is educational|tie to|learning objective|not educational|lesson plan|course of study/i,
    title: "Needs a curriculum / course tie-in",
    fix: "Attach the curriculum or course that uses this item, and write a short, specific educational-use note: name the course/subject, what the student will learn or master with it, and how. Many items (animal enclosures, garden beds, tools, tech) are approved only when a curriculum backs them up.",
  },
  {
    id: "wrong_category",
    level: "fixable",
    test: /wrong category|incorrect category|category (?:selected|chosen)|recategori|select the (?:right|correct) category|miscategor/i,
    title: "Wrong purchase category selected",
    fix: "Resubmit under the correct ClassWallet purchase category. Categories drive the caps and review path, so picking the right one (e.g. Technology, Educational Supplies, Extracurricular) is often all it takes.",
  },
  {
    id: "student_name",
    level: "fixable",
    test: /student(?:'s)? name|name on (?:the )?invoice|whose name|no student|child(?:'s)? name|name doesn'?t match/i,
    title: "Student's name needs to be on the invoice",
    fix: "For services, tutoring, and Direct Pay, the invoice should show the student's name — put it in the vendor's \"company\" field at checkout, or ask the provider to add it, then resubmit. (For physical supplies you buy yourself, a receipt with your name and the student's address is generally accepted.)",
  },
  {
    id: "used_item_proof",
    level: "fixable",
    test: /used item|second-?hand|marketplace (?:post|listing)|facebook|screenshot of (?:the )?(?:sale|listing|messages)/i,
    title: "Used-item purchase needs the right proof",
    fix: "For a used purchase, attach: (1) a screenshot of the sale post/listing, (2) a screenshot of the messages agreeing on the item and price, and (3) proof of payment. Payment must be check, PayPal, Venmo, or Cash App — never cash.",
  },
  {
    id: "mileage_docs",
    level: "fixable",
    test: /mileage (?:log|sheet|form)|route|google maps|proof of attendance|mileage (?:not|missing)|travel log/i,
    title: "Mileage documentation incomplete",
    fix: "Attach a completed mileage log (date, start, destination, round-trip miles, purpose), a screenshot of the Google Maps route, and proof of attendance. For a field trip, also include the ticket receipt — and remember field-trip mileage is filed separately from the tickets.",
  },

  // ---- Conditional (fixable only if a condition holds) -----------------------
  {
    id: "tech_cap",
    level: "conditional",
    test: /technology cap|tech cap|\$1,?000|exceeds? the cap|over the (?:tech|technology) (?:cap|limit)|too expensive.*(?:tech|computer|laptop|tablet)/i,
    title: "Over the $1,000 technology cap",
    fix: "All tech shares a $1,000/student/year cap (counted on the base price, before tax and shipping). If you're over it, it needs a documented exception approved in advance — otherwise choose a device under the remaining cap. This is only 'fixable' with an approved exception.",
  },
  {
    id: "preapproval_noncore",
    level: "conditional",
    test: /pre-?approval|prior approval|approved before (?:you )?(?:buy|purchas)|non-?core.*approval|needed approval first/i,
    title: "Non-core purchase needed pre-approval first",
    fix: "Non-core purchases are expected to need the Department's pre-approval BEFORE you buy. If you already bought it, resubmitting may not help — check whether pre-approval was required at the time. Going forward, use the Pre-approvals tool first for non-core items.",
  },
  {
    id: "field_trip_list",
    level: "conditional",
    test: /field trip|not on (?:the )?(?:approved )?(?:trip|field trip) list|location (?:not|isn't) approved|trip (?:not|isn't) approved/i,
    title: "Field trip location not on the approved list",
    fix: "A field trip is only claimable if the location is on ADE's approved field-trip list. Confirm the location is approved; if it isn't yet, it can't be reimbursed for now. If it is approved, make sure you included the student's ticket receipt and the mileage log.",
  },
  {
    id: "furniture_limits",
    level: "conditional",
    test: /desk|chair|furniture|storage (?:unit|furniture)|gaming chair/i,
    title: "Furniture limits",
    fix: "One desk (≤$300) and one chair (≤$150) per student, and no gaming or storage furniture. If your item is within those limits and non-gaming/storage, resubmit with the price shown; if it's over the limit or a gaming/storage piece, it won't qualify.",
  },
  {
    id: "husbandry_choose_one",
    level: "conditional",
    test: /coop|hutch|quail|animal (?:enclosure|pen)|rabbit|chicken/i,
    title: "Animal enclosure — one per family, with curriculum",
    fix: "A chicken coop, rabbit hutch, or quail cage is approved up to 50 sq ft and under $300, WITH a supporting curriculum — but it's one per family and you must choose only one type. If yours meets those limits and you attach the curriculum, resubmit; if you already funded a different enclosure, this one won't qualify.",
  },

  // ---- Ineligible (no fix will help) ----------------------------------------
  {
    id: "cash",
    level: "ineligible",
    test: /cash payment|paid (?:in |with )?cash|cash app is fine.*no|no cash/i,
    title: "Paid with cash",
    fix: "Cash payments are not reimbursable — there's no way to fix a cash purchase after the fact. Next time, pay by check, PayPal, Venmo, or Cash App so there's a record.",
  },
  {
    id: "streaming",
    level: "ineligible",
    test: /streaming|netflix|hulu|disney\+|prime video|paramount|peacock|apple tv|youtube tv/i,
    title: "Streaming service",
    fix: "Streaming services and one-time title rentals/purchases through a streaming company are not reimbursable, even for educational content — this can't be fixed by resubmitting. A physical DVD or a title inside an approved curriculum is a separate question.",
  },
  {
    id: "internet_service",
    level: "ineligible",
    test: /internet (?:service|bill|fee)|wi-?fi (?:service|bill)|monthly internet|broadband (?:service|bill)/i,
    title: "Internet service fees",
    fix: "Internet SERVICE fees aren't reimbursable (equipment to access the internet is a separate matter). Resubmitting the service charge won't change that.",
  },
  {
    id: "apparel_sports",
    level: "ineligible",
    test: /sports equipment|athletic gear|footwear|shoes|jeans|spirit wear|clothing|apparel|backpack|lunchbox|uniform (?:isn't|not)|jewelry|outerwear/i,
    title: "Apparel / sports gear / excluded item",
    fix: "This is on the non-qualifying list (general clothing/footwear, sports and athletic gear, spirit wear, accessories, etc.), so it won't be reimbursed no matter how it's resubmitted.",
  },
  {
    id: "duplicate",
    level: "ineligible",
    test: /duplicate|already (?:reimbursed|submitted|claimed|paid)|previously (?:reimbursed|submitted)/i,
    title: "Duplicate / already reimbursed",
    fix: "This looks like a duplicate of something already reimbursed. Resubmitting won't help — check your history to confirm it wasn't already paid.",
  },
];

const norm = (s) => (s || "").toString();

// Returns { verdict, matched:[{id,level,title,fix}], unclear:boolean }.
// verdict is the overall read: "ineligible" if the item itself is excluded,
// "conditional" if it depends on meeting a rule, "fixable" for pure doc/process
// fixes, or "unclear" when nothing matched.
export function diagnoseDenial(reason, claim = {}) {
  const hay = [norm(reason), norm(claim.items), norm(claim.category)].join(" ").toLowerCase();
  const matched = [];
  for (const r of RULES) {
    if (r.test.test(hay)) matched.push({ id: r.id, level: r.level, title: r.title, fix: r.fix });
  }
  const has = (lvl) => matched.some((m) => m.level === lvl);
  let verdict = "unclear";
  if (matched.length) {
    // An excluded item dominates only when there isn't a plausible doc fix too.
    if (has("ineligible") && !has("fixable")) verdict = "ineligible";
    else if (has("fixable")) verdict = "fixable";
    else if (has("conditional")) verdict = "conditional";
    else verdict = "ineligible";
  }
  return { verdict, matched, unclear: matched.length === 0 };
}

export const VERDICT_LABEL = {
  fixable: "Looks fixable",
  conditional: "Fixable if the rule is met",
  ineligible: "Not reimbursable — resubmitting won't help",
  unclear: "Not sure from the wording",
};

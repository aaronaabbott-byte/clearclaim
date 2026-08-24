// Rule-based ineligibility screen for the eligibility check.
//
// The eligibility tool used to only ask "core vs non-core," which routed
// everything not on the core list to "proceed for now" — so plainly excluded
// things (shoes, a couch, a vacation) passed. This screen catches the clear
// cases and lets the tool return a hard "very unlikely to qualify" with the
// controlling citation, per the rule's exclusions and the ordinary-&-necessary
// standard.
//
// Deliberately CONSERVATIVE: only obvious, hard-to-argue exclusions. It is worse
// to wrongly fail an eligible item than to miss one, so ambiguous items (which
// could have a real instructional tie) are left to the core/non-core path and
// the AI reading. The Department still makes the final decision.

export const EXCLUSIONS = [
  {
    id: "clothing",
    label: "General clothing / footwear",
    citation: "35-102(4), 35-102(26)(D)",
    reason: "General clothing and footwear are not instructional in nature. School uniforms are a narrow exception, limited to uniforms required by and standardized to a school or program's dress code — which doesn't cover ordinary shoes or clothes.",
    keywords: ["shoe", "sneaker", "footwear", "cleats", "boots", "sandal", "jeans", "t-shirt", "tshirt", "hoodie", "sweater", "jacket", "winter coat", "raincoat", "socks", "underwear", "pajama", "swimsuit", "prom dress", "everyday clothes", "clothing"],
  },
  {
    id: "recreational",
    label: "Recreational / hobby / entertainment",
    citation: "35-102(22)(A), 35-115(d)",
    reason: "Primarily recreational, hobby, or entertainment purchases are excluded unless directly tied to a structured instructional program with clear academic or career objectives.",
    keywords: ["video game", "gaming console", "game console", "xbox", "playstation", "nintendo switch", "trampoline", "bounce house", "theme park", "amusement park", "water park", "vacation", "family trip", "cruise", "disney", "hot tub", "swing set"],
  },
  {
    id: "household_realproperty",
    label: "Household furnishings / real property",
    citation: "35-117(f)",
    reason: "General household furnishings, and improvements or fixtures to real property, are not ordinary and necessary educational expenses even if used incidentally for schoolwork.",
    keywords: ["couch", "sofa", "recliner", "mattress", "bed frame", "refrigerator", "washer", "dryer", "lawnmower", "lawn mower", "patio", "fence", "flooring", "carpet install", "renovation", "remodel", "water heater", "hvac", "air conditioner", "riding mower", "shed"],
  },
  {
    id: "food",
    label: "Groceries / personal food",
    citation: "35-114, 35-115",
    reason: "Groceries and everyday food are personal living expenses, not ordinary and necessary educational expenses.",
    keywords: ["groceries", "grocery", "weekly food", "snacks for home", "lunch food"],
  },
  {
    id: "vehicle",
    label: "Vehicles / personal transport",
    citation: "35-114, 35-115",
    reason: "Vehicles and personal transportation equipment are not ordinary and necessary educational expenses. (Approved mileage to a provider is handled separately under the transportation category.)",
    keywords: ["car ", "used car", "atv", "golf cart", "moped", "motorcycle", "e-bike", "electric bike", "gas for", "car repair", "oil change"],
  },
  {
    id: "technology_excluded",
    label: "Excluded technology",
    citation: "35-102(26)(Q)(ii), (iii)",
    reason: "Televisions, video-game consoles and accessories, home-theater and audio equipment, and personal communication devices (phones, smartwatches) are specifically excluded from the technology category.",
    keywords: ["television", " tv ", "home theater", "soundbar", "smartphone", "iphone", "cell phone", "cellphone", "mobile phone", "smart watch", "smartwatch", "apple watch"],
  },
];

// Returns the matched exclusion object, or null. Space-padding trims some
// false positives (e.g. " tv " won't match "study").
export function screenExclusion(description) {
  const hay = ` ${(description || "").toLowerCase()} `;
  for (const ex of EXCLUSIONS) {
    if (ex.keywords.some(k => hay.includes(k))) return ex;
  }
  return null;
}

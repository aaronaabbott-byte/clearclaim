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
    id: "streaming",
    label: "Streaming services / streaming purchases",
    citation: "35-115",
    reason: "Anything bought from a streaming company is not reimbursable in Arkansas — subscriptions AND one-time purchases or rentals of a title. This is true no matter how educational the content is: ADE has confirmed that even a documentary or film required for a lesson, bought or rented through a streaming company because that's the only way to view it, does not qualify. Covers Netflix, Amazon Prime / Prime Video / Amazon digital video, Hulu, Disney+, HBO/Max, Paramount+, Peacock, Apple TV+ / iTunes, Google Play / YouTube movies, Vudu/Fandango, and any other streaming platform. (A physical DVD or a title inside an approved curriculum is a separate question — this is about buying, renting, or streaming video from a streaming service.)",
    keywords: ["netflix", "hulu", "disney+", "disney plus", "amazon prime", "prime video", "amazon video", "amazon instant video", "hbo max", " max ", "paramount+", "paramount plus", "peacock", "apple tv+", "apple tv plus", "apple tv", "itunes movie", "itunes video", "google play movie", "youtube movie", "youtube tv", "sling tv", "vudu", "fandango at home", "video on demand", "streaming service", "streaming subscription", "rent a movie", "rent the movie", "rent a documentary", "rent a film", "digital rental", "digital movie", "digital film", "stream the documentary", "stream a documentary", "movie rental", "film rental", "documentary rental"],
  },
  {
    id: "technology_excluded",
    label: "Excluded technology",
    citation: "35-102(26)(Q)(ii), (iii)",
    reason: "Televisions, video-game consoles and accessories, home-theater and audio equipment, and personal communication devices (phones, smartwatches) are specifically excluded from the technology category.",
    keywords: ["television", " tv ", "home theater", "soundbar", "smartphone", "iphone", "cell phone", "cellphone", "mobile phone", "smart watch", "smartwatch", "apple watch"],
  },
];

// A streaming purchase can be phrased many ways ("history documentary bought
// through Amazon", "rent the film on Apple TV", "digital download of the movie").
// We catch it two ways without over-blocking legit educational video courses
// (Outschool, Great Courses, an online class that happens to use video):
//   1. a named streaming platform mentioned alongside a video title, or
//   2. renting/buying/downloading a specific video title digitally.
// A generic "streaming video course" or "online video lessons" is NOT caught —
// only actual streaming-company titles.
const STREAMING_PLATFORM = /(netflix|hulu|disney\s*\+|disney plus|amazon(?:\s+prime| video| instant video)?|prime video|hbo\s*max|paramount\s*\+|peacock|apple\s*tv|itunes|google\s*play|vudu|fandango at home|sling tv|redbox|video on demand|\bvod\b)/;
const VIDEO_TITLE = /(movie|film|documentary|docuseries|feature film|mini-?series)/;
const RENT = /(rent|rental|renting)/;
const BUY_DIGITAL = /(buy|bought|purchase|download|stream|streaming|digital)/;
const DIGITAL_CUE = /(digital|online|stream|download|on demand|\bvod\b|apple\s*tv|itunes|amazon|prime|google\s*play|vudu)/;

// Returns the matched exclusion object, or null. Space-padding trims some
// false positives (e.g. " tv " won't match "study").
export function screenExclusion(description) {
  const raw = (description || "").toLowerCase();
  const hay = ` ${raw} `;
  // Physical media is a separate question per ADE, so a DVD/Blu-ray never trips
  // the streaming screen even if it's sold on Amazon.
  const physical = /(dvd|blu-?ray|disc|physical copy|boxed set|box set)/.test(raw);
  const streamingMatch = !physical && (
    // documentary/movie named with a streaming platform
    (VIDEO_TITLE.test(raw) && STREAMING_PLATFORM.test(raw)) ||
    // renting a title (a rental is inherently streaming/VOD)
    (VIDEO_TITLE.test(raw) && RENT.test(raw)) ||
    // buying/downloading/streaming a title digitally
    (VIDEO_TITLE.test(raw) && BUY_DIGITAL.test(raw) && DIGITAL_CUE.test(raw))
  );
  if (streamingMatch) return EXCLUSIONS.find(e => e.id === "streaming") || null;
  for (const ex of EXCLUSIONS) {
    if (ex.keywords.some(k => hay.includes(k))) return ex;
  }
  return null;
}

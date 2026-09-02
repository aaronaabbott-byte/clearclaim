// Arkansas EFA vendor directory, built from Ann's ClassWallet vendor export.
// Data lives in vendors.json (name, optional cleaned "core" name, aliases, and
// type: "marketplace" | "directpay"). Refreshing is just re-running the build
// against a newer export and replacing vendors.json.
import data from "./vendors.json";

export const VENDORS = data.vendors || [];
export const VENDOR_COUNT = data.count || VENDORS.length;
export const VENDOR_UPDATED = data.updated || null;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Precompute a search blob per vendor once at module load.
const BLOBS = VENDORS.map((v) =>
  norm([v.name, v.core, ...(v.aliases || [])].filter(Boolean).join(" "))
);

// Names often bundle the "what people call it" version after a comma, slash, or
// DBA (e.g. "Art Life LLC dba Painting with a Twist", "A Nerdy Company, Varsity
// Tutors"). Split into segments so a query that equals one segment counts as a
// confident hit — that mismatch is the #1 "I can't find them" complaint.
const stripLead = (s) => s.replace(/^(?:the|a|an)\s+/, "");
const SEGMENTS = VENDORS.map((v) => {
  const raw = String(v.name)
    .split(/,|\/|\bd\/?b\/?a\b|\bdba\b|;/i)
    .map(norm)
    .filter((x) => x && x.length >= 2);
  (v.aliases || []).forEach((a) => raw.push(norm(a)));
  // include an article-stripped variant of each segment so "good and the
  // beautiful" matches "The Good and the Beautiful"
  const segs = new Set();
  raw.forEach((x) => { segs.add(x); segs.add(stripLead(x)); });
  return [...segs].filter((x) => x.length >= 2);
});

// Score-ranked search over official name + cleaned name + aliases.
export function findVendors(query, limit = 25) {
  const q = norm(query);
  if (!q || q.length < 2) return [];
  const toks = q.split(" ").filter(Boolean);
  const out = [];
  for (let i = 0; i < VENDORS.length; i++) {
    const b = BLOBS[i];
    const v = VENDORS[i];
    const nm = norm(v.name);
    let score = 0;
    if (nm === q) score = 100;
    else if (nm.startsWith(q)) score = 80;
    else if (b.includes(q)) score = 60;
    else if (toks.length > 1 && toks.every((t) => b.includes(t))) score = 40;
    else continue;
    out.push({ v, score });
  }
  out.sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name));
  return out.slice(0, limit).map((r) => r.v);
}

// Best single confident match — used by Ann to answer "is X a vendor?".
// Returns { vendor, confident } or null. "confident" is true for an exact or
// prefix name/alias hit, so Ann can speak plainly vs. hedge.
export function bestVendorMatch(query) {
  const q = norm(query);
  if (!q || q.length < 2) return null;
  let best = null;
  for (let i = 0; i < VENDORS.length; i++) {
    const v = VENDORS[i];
    const nm = norm(v.name);
    const segs = SEGMENTS[i];
    let score = 0;
    if (nm === q || segs.includes(q)) score = 100;
    else if (nm.startsWith(q) || segs.some((a) => a.startsWith(q) || a === q)) score = 80;
    else if (BLOBS[i].includes(q) && q.length >= 4) score = 55;
    else continue;
    if (!best || score > best.score) best = { v, score };
  }
  if (!best) return null;
  return { vendor: best.v, confident: best.score >= 80 };
}

export const typeLabel = (t) => (t === "marketplace" ? "Marketplace" : "Direct Pay");

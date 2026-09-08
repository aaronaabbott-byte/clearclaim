// "Where do I buy X in ClassWallet" lookup, sourced LIVE from Ann's
// curriculum-finder Google Sheet so her edits show up without a redeploy.
//
// How the freshness works: the parsed sheet is cached in server memory for
// TTL_MS. The first Ann request after that window refetches the sheet; if the
// fetch fails (sheet moved, offline, etc.) we fall back to the last good cache,
// and if we've never fetched, to the bundled snapshot in itemstores.json. So it
// auto-updates within ~30 min of Ann editing the sheet, and never hard-breaks.
import snapshot from "./itemstores.json";

// Google Sheet: tabs "Products" (item -> stores) and "Curriculum" (curriculum ->
// who carries it). Must stay shared as "anyone with the link can view".
const SHEET_ID = "1KzEx2GsYcOJa_3Fq1X6TEnRW8MBOl7-_Dy794XbNDNo";
const csvUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
const TTL_MS = 30 * 60 * 1000;

// ---- CSV + cleaning (ports the build script) --------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const CANON = {};
const reg = (display, ...variants) => {
  CANON[display.toLowerCase()] = display;
  variants.forEach((v) => (CANON[v.toLowerCase()] = display));
};
reg("Lavender Vibes", "lavendar vibes");
reg("Sunny Sprouts Education", "sunnysprouts education", "sunny sprout education", "sunnysprout education");
reg("Learning Among the Pines"); reg("Dandelion Roots"); reg("Staples");
reg("Rainbow Resource", "rainbow resources", "rainbow resouce", "rainbow reasources");
reg("Grace & Truth Books", "grace and truth books"); reg("Christian Book");
reg("Heritage Homeschool Supply's", "heritage homeschool supplys");
reg("Best Buy"); reg("Office Depot"); reg("Amazeum"); reg("Lakeshore");
reg("Home Science Tools"); reg("Carolina Biological"); reg("Snake River Strings");
reg("Palmer Music"); reg("West Music"); reg("Back Beat"); reg("Moosiko");
reg("The Snazzy Snail", "snazzy snail"); reg("Oriental Trading"); reg("Purposely Crafted");
reg("Home Works for Books"); reg("Well Planned Gal"); reg("nature+nurture");
reg("Knowledge Crates"); reg("Aardvarks Horticulture"); reg("Leaf'd Box");
reg("ARMA Power PC", "arma power pc"); reg("hand2mind"); reg("I Create Art"); reg("Geokidz");
reg("McGregors Teachers Supply", "mcgregors teachers supply"); reg("The Fidget Game");
reg("Sewing Society"); reg("Mandy Petty Photography"); reg("Katie Spickles");
reg("Todd the Music Guy"); reg("BloomLoom Looms"); reg("books4school");
reg("Bookshop Classics"); reg("Autism Community Store"); reg("Yoto"); reg("Timberdoodle");
reg("Bookshark"); reg("Milestone Books"); reg("Soul Sparklettes Art");
reg("Well-Trained Mind", "well trained mind"); reg("First Homeschool"); reg("Torchlight Curriculum");

const collapse = (s) => (s || "").replace(/\s+/g, " ").trim();
function canonStore(name) {
  const n = collapse(name).replace(/\.+$/, "").trim();
  const key = n.toLowerCase();
  if (CANON[key]) return CANON[key];
  return n.split(" ").map((w) => (w === w.toUpperCase() && w.length <= 4 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ");
}
function parseStore(cell) {
  const c = collapse(cell);
  if (!c) return null;
  const idx = c.lastIndexOf("-");
  if (idx > 0) {
    const typ = c.slice(idx + 1);
    if (/pay|market/i.test(typ)) {
      return { name: canonStore(c.slice(0, idx)), type: /market/i.test(typ) ? "marketplace" : "directpay" };
    }
  }
  return { name: canonStore(c), type: "directpay" };
}

function parseSheets(productsCsv, curriculumCsv) {
  const pRows = parseCsv(productsCsv).slice(1);
  const byItem = new Map();
  for (const row of pRows) {
    if (!row || !collapse(row[0])) continue;
    const item = collapse(row[0]);
    const key = item.toLowerCase();
    const stores = byItem.get(key)?.stores || [];
    const seen = new Set(stores.map((s) => s.name.toLowerCase() + "|" + s.type));
    for (let i = 1; i < row.length; i++) {
      const s = parseStore(row[i]);
      if (s && !seen.has(s.name.toLowerCase() + "|" + s.type)) {
        seen.add(s.name.toLowerCase() + "|" + s.type); stores.push(s);
      }
    }
    if (stores.length) byItem.set(key, { item: byItem.get(key)?.item || item, stores });
  }
  const products = [...byItem.values()];

  const cRows = parseCsv(curriculumCsv).slice(1);
  const curriculum = [];
  for (const row of cRows) {
    if (!row || !collapse(row[0])) continue;
    curriculum.push({
      name: collapse(row[0]),
      carriers: collapse(row[1] || ""),
      reimbursementOnly: /reimburse/i.test(row[2] || ""),
    });
  }
  return { products, curriculum };
}

// ---- live cache -------------------------------------------------------------
let cache = { products: snapshot.products || [], curriculum: snapshot.curriculum || [], at: 0, live: false };

export async function loadItemData() {
  if (cache.at && Date.now() - cache.at < TTL_MS) return cache;
  try {
    const [p, c] = await Promise.all([
      fetch(csvUrl("Products"), { cache: "no-store" }).then((r) => (r.ok ? r.text() : Promise.reject(r.status))),
      fetch(csvUrl("Curriculum"), { cache: "no-store" }).then((r) => (r.ok ? r.text() : Promise.reject(r.status))),
    ]);
    const parsed = parseSheets(p, c);
    if (parsed.products.length && parsed.curriculum.length) {
      cache = { ...parsed, at: Date.now(), live: true };
    }
  } catch {
    // keep whatever we have (last good cache, or bundled snapshot)
    cache = { ...cache, at: Date.now() || 1 };
  }
  return cache;
}

// ---- matching (operate on a dataset so live + snapshot both work) -----------
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const singular = (s) => s.replace(/\b(\w{4,})s\b/g, "$1");

function score(key, q) {
  if (!key) return 0;
  if (key === q || singular(key) === singular(q)) return 100;
  if (key.startsWith(q) || q.startsWith(key)) return 80;
  if (key.includes(q) || q.includes(key)) return 65;
  const qt = q.split(" ").filter(Boolean);
  if (qt.length && qt.every((t) => key.includes(t))) return 50;
  return 0;
}

export function findProduct(ds, query) {
  const q = norm(query);
  if (q.length < 2) return null;
  let best = null;
  for (const p of ds.products) {
    const s = score(norm(p.item), q);
    if (s && (!best || s > best.s)) best = { p, s };
  }
  return best ? { product: best.p, confident: best.s >= 65 } : null;
}

export function findCurriculum(ds, query) {
  const q = norm(query);
  if (q.length < 3) return null;
  let best = null;
  for (const c of ds.curriculum) {
    const s = score(norm(c.name), q);
    if (s && (!best || s > best.s)) best = { c, s };
  }
  return best ? { curriculum: best.c, confident: best.s >= 65 } : null;
}

export function lookupItem(ds, query) {
  const p = findProduct(ds, query);
  if (p && p.confident) return { kind: "product", ...p };
  const c = findCurriculum(ds, query);
  if (c && c.confident) return { kind: "curriculum", ...c };
  if (p) return { kind: "product", ...p };
  if (c) return { kind: "curriculum", ...c };
  return null;
}

export function scanMessageForItem(ds, message) {
  const m = norm(message);
  if (m.length < 5) return null;
  let best = null;
  const consider = (key, make) => {
    if (key.length >= 5 && (key.includes(" ") || key.length >= 8) && m.includes(key) && (!best || key.length > best.len)) {
      best = { len: key.length, make };
    }
  };
  ds.products.forEach((p) => consider(norm(p.item), () => ({ kind: "product", product: p, confident: true })));
  ds.curriculum.forEach((c) => consider(norm(c.name), () => ({ kind: "curriculum", curriculum: c, confident: true })));
  return best ? best.make() : null;
}

export const tLabel = (t) => (t === "marketplace" ? "Marketplace" : "Direct Pay");
export const storeList = (stores) => stores.map((s) => `${s.name} (${tLabel(s.type)})`).join(", ");

// Minimal, dependency-free .xlsx reader. An .xlsx is a ZIP of XML parts; we
// inflate the parts we need with Node's built-in zlib and pull cell values out
// by reference (A1, B4, …). This exists so the mileage importer doesn't pull in
// the heavy `xlsx` npm package (which kept not installing on deploy). It handles
// shared strings, inline strings, numbers, and — by column position — Excel date
// serials, which is all the state's Travel Reimbursement Request Form needs.
import zlib from "zlib";

// --- tiny ZIP reader (central-directory based) -----------------------------
function readZip(buf) {
  // Locate the End of Central Directory record (scan back for signature).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    files[name] = { method, compSize, localOff };
    off += 46 + nameLen + extraLen + commentLen;
  }
  const extract = (name) => {
    const f = files[name];
    if (!f) return null;
    // Local header: data begins after its own (possibly different) name/extra lens.
    const lo = f.localOff;
    if (buf.readUInt32LE(lo) !== 0x04034b50) return null;
    const nameLen = buf.readUInt16LE(lo + 26);
    const extraLen = buf.readUInt16LE(lo + 28);
    const start = lo + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + f.compSize);
    return f.method === 0 ? data : zlib.inflateRawSync(data);
  };
  return { names: Object.keys(files), extract };
}

const decode = (s) => String(s)
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, "&");

// Excel 1900 date-serial → YYYY-MM-DD (accounts for the 1900 leap-year bug).
function serialToDate(n) {
  const serial = Math.floor(n);
  if (serial < 1 || serial > 2958465) return null; // outside 1900-9999
  const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
  const d = new Date(ms);
  if (isNaN(d)) return null;
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// Parse the first worksheet into a { "A1": value } map. `dateCols` (e.g. ["A"])
// and `dateCells` (e.g. ["B4"]) tell us which numeric cells are really dates.
export function readFirstSheet(buffer, { dateCols = [], dateCells = [] } = {}) {
  const zip = readZip(buffer);

  // Shared strings table.
  const shared = [];
  const ssXml = zip.extract("xl/sharedStrings.xml");
  if (ssXml) {
    const s = ssXml.toString("utf8");
    const reSi = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = reSi.exec(s))) {
      // Concatenate every <t> inside the <si> (handles rich-text runs).
      const parts = [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]);
      shared.push(decode(parts.join("")));
    }
  }

  // First worksheet: prefer sheet1.xml, else the lowest-numbered worksheet file.
  let sheetName = "xl/worksheets/sheet1.xml";
  if (!zip.names.includes(sheetName)) {
    const ws = zip.names.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => (+a.match(/(\d+)/)[1]) - (+b.match(/(\d+)/)[1]));
    sheetName = ws[0];
  }
  const sheetBuf = sheetName && zip.extract(sheetName);
  if (!sheetBuf) throw new Error("no worksheet");
  const xml = sheetBuf.toString("utf8");

  const dateColSet = new Set(dateCols);
  const dateCellSet = new Set(dateCells);
  const cells = {};
  // Each cell: <c r="A7" t="s"><v>3</v></c> or inline <c r="A7" t="inlineStr"><is><t>..</t></is></c>
  const reCell = /<c\b([^>]*)\br="([A-Z]+\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let c;
  while ((c = reCell.exec(xml))) {
    const attrs = c[1] + c[3];
    const ref = c[2];
    const inner = c[4] || "";
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "n";
    let val = "";
    if (t === "inlineStr") {
      const parts = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]);
      val = decode(parts.join(""));
    } else {
      const v = (inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
      if (v == null) { val = ""; }
      else if (t === "s") { val = shared[+v] ?? ""; }
      else if (t === "str") { val = decode(v); }
      else {
        // numeric — may be a date serial in a known date position.
        const col = ref.match(/^[A-Z]+/)[0];
        if ((dateColSet.has(col) || dateCellSet.has(ref))) {
          val = serialToDate(+v) || v;
        } else {
          val = v;
        }
      }
    }
    cells[ref] = typeof val === "string" ? val.trim() : val;
  }
  return cells;
}

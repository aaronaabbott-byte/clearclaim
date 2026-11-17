// Arkansas EFA travel/mileage reimbursement. The state's rate is $0.52/mile.
// Families must submit a travel log; the state's Excel template breaks
// ClassWallet's uploader ("OcrReceiptItem ... imageType undefined"), so
// ClearClaim renders the same log as a clean JPEG image that uploads fine.
export const MILEAGE_RATE = 0.52;

export function mileageTotals(trips, rate = MILEAGE_RATE) {
  const totalMiles = (trips || []).reduce((s, t) => s + (Number(t.miles) || 0), 0);
  return { totalMiles, total: totalMiles * rate };
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// Columns mirror the state's "Travel Reimbursement Request Form".
const COLS = [
  { key: "date", label: ["Date of Trip"], w: 150, max: 16, align: "middle" },
  { key: "startName", label: ["Name of", "Starting Location"], w: 185, max: 24 },
  { key: "startAddr", label: ["Address of", "Starting Location"], w: 300, max: 40 },
  { key: "endName", label: ["Name of", "Ending Location"], w: 185, max: 24 },
  { key: "endAddr", label: ["Address of", "Ending Location"], w: 300, max: 40 },
  { key: "roundTrip", label: ["Round", "Trip?"], w: 100, max: 6, align: "middle" },
  { key: "miles", label: ["Mileage", "(per GPS)"], w: 232, max: 10, align: "end" },
];

// Build the mileage log as an SVG string (pure — safe anywhere). A client helper
// rasterizes it to a JPEG for upload.
export function buildMileageSvg(data, rate = MILEAGE_RATE) {
  const trips = (data?.trips || []).filter(t => t && (t.date || t.miles));
  const { totalMiles, total } = mileageTotals(trips, rate);
  const W = 1500, M = 24, TW = W - M * 2;
  const xs = []; let x = M; for (const c of COLS) { xs.push(x); x += c.w; }
  const tipX = (i) => xs[i] + 10;

  const parts = [];
  const push = (s) => parts.push(s);
  const text = (xx, yy, str, { size = 15, weight = "normal", fill = "#1f2530", anchor = "start" } = {}) =>
    push(`<text x="${xx}" y="${yy}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(str)}</text>`);
  const rect = (xx, yy, w, h, fill, stroke) =>
    push(`<rect x="${xx}" y="${yy}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ""}/>`);

  // Title + student box
  text(W / 2, 46, "Travel Reimbursement Request Form", { size: 30, weight: "bold", fill: "#16324e", anchor: "middle" });
  const sbY = 76, sbRowH = 30, sbLabelW = 150, sbValW = 280;
  const sbRows = [["Student Name", data?.studentName || ""], ["Current Date", data?.date || ""]];
  sbRows.forEach((r, i) => {
    const y = sbY + i * sbRowH;
    rect(M, y, sbLabelW, sbRowH, "#16324e", "#16324e");
    rect(M + sbLabelW, y, sbValW, sbRowH, "#fff", "#16324e");
    text(M + 8, y + 20, r[0], { size: 13, weight: "bold", fill: "#fff" });
    text(M + sbLabelW + 8, y + 20, clip(r[1], 34), { size: 14 });
  });

  // Header
  const headY = sbY + sbRowH * 2 + 16, headH = 52;
  rect(M, headY, TW, headH, "#2f6b4e", "#2f6b4e");
  COLS.forEach((c, i) => {
    const cx = c.align === "middle" ? xs[i] + c.w / 2 : c.align === "end" ? xs[i] + c.w - 10 : tipX(i);
    const anchor = c.align === "middle" ? "middle" : c.align === "end" ? "end" : "start";
    c.label.forEach((ln, li) => text(cx, headY + (c.label.length === 2 ? 22 + li * 18 : 31), ln, { size: 13.5, weight: "bold", fill: "#fff", anchor }));
  });
  // column separators in header
  xs.slice(1).forEach(sx => push(`<line x1="${sx}" y1="${headY}" x2="${sx}" y2="${headY + headH}" stroke="#ffffff55" stroke-width="1"/>`));

  // Rows
  const rowH = 42;
  const bodyRows = Math.max(trips.length, 3); // a few blank rows look like the form
  let y = headY + headH;
  for (let r = 0; r < bodyRows; r++) {
    const t = trips[r];
    rect(M, y, TW, rowH, r % 2 ? "#f7f7f4" : "#ffffff", "#d9d9d9");
    if (t) {
      COLS.forEach((c, i) => {
        let v = t[c.key];
        if (c.key === "roundTrip") v = t.roundTrip ? "Yes" : "";
        if (c.key === "miles") v = (t.miles === 0 || t.miles) ? String(t.miles) : "";
        const str = clip(v, c.max);
        const cx = c.align === "middle" ? xs[i] + c.w / 2 : c.align === "end" ? xs[i] + c.w - 10 : tipX(i);
        const anchor = c.align === "middle" ? "middle" : c.align === "end" ? "end" : "start";
        text(cx, y + 27, str, { size: 14.5, anchor });
      });
    }
    y += rowH;
  }
  // vertical grid lines over the body
  xs.slice(1).forEach(sx => push(`<line x1="${sx}" y1="${headY + headH}" x2="${sx}" y2="${y}" stroke="#d9d9d9" stroke-width="1"/>`));
  push(`<line x1="${M}" y1="${headY + headH}" x2="${M}" y2="${y}" stroke="#d9d9d9" stroke-width="1"/>`);
  push(`<line x1="${W - M}" y1="${headY + headH}" x2="${W - M}" y2="${y}" stroke="#d9d9d9" stroke-width="1"/>`);

  // Totals
  const milesRight = W - M - 10, labelRight = xs[6] - 14;
  text(labelRight, y + 28, "Total Miles", { size: 15, weight: "bold", anchor: "end" });
  text(milesRight, y + 28, String(totalMiles), { size: 15, weight: "bold", anchor: "end" });
  text(labelRight, y + 54, `Reimbursement Total (${money(rate)} per mile)`, { size: 15, weight: "bold", anchor: "end" });
  text(milesRight, y + 54, money(total), { size: 16, weight: "bold", fill: "#16324e", anchor: "end" });

  // Reminders
  let ry = y + 90;
  text(M, ry, "Travel Reimbursement Reminders:", { size: 14, weight: "bold", fill: "#16324e" });
  const reminders = [
    "1. Acceptable entries for \"Name of Starting Location\" and \"Name of Ending Location\" are \"Home\" or names of participating EFA service providers.",
    "2. Only trips where the child is present can be requested. If dropping a child off, the return trip without the child is not eligible.",
    "3. You can only be reimbursed once per trip, even if multiple kids are in the car.",
    "4. Travel reimbursement is limited to 25% of annual disbursement per year.",
  ];
  reminders.forEach((rm, i) => text(M, ry + 24 + i * 22, rm, { size: 12.5, fill: "#45506a" }));
  const H = ry + 24 + reminders.length * 22 + 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`;
}

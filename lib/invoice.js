// Branded invoice PDF for any ESA/EFA program (ClassWallet is used nationwide).
// Matches the fields these programs' templates ask for (vendor,
// contact, student, parent, date, invoice #, line items, notes, totals) but on
// the provider's own letterhead.

export function lineTotal(it) {
  return (Number(it.qty) || 0) * (Number(it.unit_price) || 0);
}
export function invoiceTotals(inv) {
  const subtotal = (inv.items || []).reduce((s, it) => s + lineTotal(it), 0);
  const shipping = Number(inv.shipping) || 0;
  const tax = Number(inv.tax) || 0;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
const money = (n) => `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

export async function buildInvoicePdf(inv, provider) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const navy = [22, 50, 78], ink = [30, 34, 42], muted = [113, 118, 127], gold = [198, 138, 28];
  const p = provider || {};

  // ---- Letterhead ----
  let textX = M, ly = 46;
  if (p.logoDataUrl) {
    try {
      const props = doc.getImageProperties(p.logoDataUrl);
      const ratio = Math.min(120 / props.width, 54 / props.height);
      const w = props.width * ratio, h = props.height * ratio;
      doc.addImage(p.logoDataUrl, props.fileType || "PNG", M, 34, w, h);
      textX = M + w + 16;
    } catch { /* skip logo */ }
  }

  // Right-side invoice block. Draw it (and measure its width) FIRST so the left
  // letterhead can be wrapped to whatever space is left, instead of running into
  // it — a long business name, email, or website used to overlap these fields.
  const rightMeta = [
    inv.invoice_no ? `Invoice #: ${inv.invoice_no}` : null,
    inv.invoice_date ? `Date: ${inv.invoice_date}` : null,
  ].filter(Boolean);
  doc.setFont("times", "bold"); doc.setFontSize(24);
  let rightW = doc.getTextWidth("INVOICE");
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  for (const line of rightMeta) rightW = Math.max(rightW, doc.getTextWidth(line));

  doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...navy);
  doc.text("INVOICE", W - M, 46, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...muted);
  let ry = 62;
  for (const line of rightMeta) { doc.text(line, W - M, ry, { align: "right" }); ry += 13; }

  // Left letterhead, wrapped to the column left of the invoice block. Website
  // sits on its own line so it can't collide with the date.
  const gap = 24;
  const leftMax = Math.max(140, (W - M - rightW - gap) - textX);
  const drawLeft = (text, font, style, size, color) => {
    if (!text) return;
    doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...color);
    for (const ln of doc.splitTextToSize(String(text), leftMax)) { doc.text(ln, textX, ly); ly += size + 3; }
  };
  drawLeft(p.business_name || p.provider_name || "Invoice", "times", "bold", 18, navy);
  const who = [p.provider_name, p.credentials].filter(Boolean).join(", ");
  if (who && p.business_name) drawLeft(who, "helvetica", "normal", 10.5, ink);
  drawLeft([p.contact_email, p.contact_phone].filter(Boolean).join("   ·   "), "helvetica", "normal", 9.5, muted);
  drawLeft(p.contact_website, "helvetica", "normal", 9.5, muted);

  let y = Math.max(ly, ry) + 14;
  doc.setDrawColor(...gold); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); y += 22;

  // ---- Bill to ----
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...navy);
  doc.text("BILL TO", M, y);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...ink); doc.setFontSize(11);
  let by = y + 15;
  if (inv.student_name) { doc.text(`Student: ${inv.student_name}`, M, by); by += 14; }
  if (inv.parent_name) { doc.text(`Parent/Guardian: ${inv.parent_name}`, M, by); by += 14; }
  y = by + 10;

  // ---- Line items table ----
  const cols = { desc: M, qty: W - M - 200, price: W - M - 120, amt: W - M };
  doc.setFillColor(...navy); doc.rect(M, y, W - M * 2, 22, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Description", cols.desc + 6, y + 15);
  doc.text("Qty", cols.qty, y + 15, { align: "right" });
  doc.text("Unit price", cols.price, y + 15, { align: "right" });
  doc.text("Amount", cols.amt - 6, y + 15, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal"); doc.setTextColor(...ink); doc.setFontSize(10.5);
  for (const it of inv.items || []) {
    if (!it.desc && !it.qty && !it.unit_price) continue;
    const descLines = doc.splitTextToSize(String(it.desc || ""), cols.qty - M - 20);
    const rowH = Math.max(20, descLines.length * 13 + 6);
    if (y + rowH > H - 120) { doc.addPage(); y = M; }
    let ty = y + 14;
    descLines.forEach((ln, i) => doc.text(ln, cols.desc + 6, ty + i * 13));
    doc.text(String(it.qty ?? ""), cols.qty, ty, { align: "right" });
    doc.text(it.unit_price ? money(it.unit_price) : "", cols.price, ty, { align: "right" });
    doc.text(money(lineTotal(it)), cols.amt - 6, ty, { align: "right" });
    y += rowH;
    doc.setDrawColor(230, 227, 217); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
  }

  // ---- Totals ----
  const t = invoiceTotals(inv);
  y += 16;
  const labelX = W - M - 120, valX = W - M;
  const totalRow = (label, val, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 12 : 10.5);
    doc.setTextColor(...(bold ? navy : muted));
    doc.text(label, labelX, y, { align: "right" });
    doc.setTextColor(...(bold ? navy : ink));
    doc.text(money(val), valX, y, { align: "right" }); y += bold ? 20 : 16;
  };
  totalRow("Subtotal", t.subtotal);
  if (t.shipping) totalRow("Shipping", t.shipping);
  if (t.tax) totalRow("Tax", t.tax);
  totalRow("Total", t.total, true);

  // ---- Notes ----
  if (inv.notes) {
    y += 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...navy);
    doc.text("Notes", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...ink); doc.setFontSize(10);
    doc.splitTextToSize(String(inv.notes), W - M * 2).forEach(ln => { doc.text(ln, M, y); y += 13; });
  }

  doc.setTextColor(...muted); doc.setFontSize(9);
  doc.text("Prepared with ClearClaim.", M, H - 28);
  return doc;
}

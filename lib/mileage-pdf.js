// Builds the Travel Reimbursement Request Form as a VECTOR PDF with jsPDF.
// Why vector (real text), not an image: ClassWallet's OCR rejects PDF 1.5+ files
// (the "imageType: undefined" error — its parser can't read the object/xref
// streams those versions use) but accepts older ones. jsPDF emits PDF 1.3 with a
// classic xref table and no object streams, which we confirmed ClassWallet
// accepts (a 1.4 build of this same form uploaded cleanly; the state's Excel/
// Word 1.7 exports did not). Runs entirely in the browser — no server, no extra
// dependency (jsPDF is already bundled for claim packets).
import { jsPDF } from "jspdf";
import { MILEAGE_RATE, mileageTotals } from "@/lib/mileage";

const NAVY = [22, 50, 78], GREEN = [47, 107, 78], GRID = [201, 201, 201], ZEBRA = [247, 247, 244];

export function buildMileagePdf(data, rate = MILEAGE_RATE) {
  const trips = (data?.trips || []).filter(t => t && (t.date || t.miles || t.startName || t.endName));
  const { totalMiles, total } = mileageTotals(trips, rate);
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const M = 40, W = 612, CW = W - 2 * M;
  let y = 56;

  doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY); doc.setFontSize(18);
  doc.text("Travel Reimbursement Request Form", W / 2, y, { align: "center" }); y += 20;

  const labW = 110, valW = 240, rH = 22;
  [["Student Name", data?.studentName || ""], ["Current Date", data?.date || ""]].forEach((r, i) => {
    const ry = y + i * rH;
    doc.setFillColor(...NAVY); doc.rect(M, ry, labW, rH, "F");
    doc.setDrawColor(...NAVY); doc.rect(M + labW, ry, valW, rH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(r[0], M + 6, ry + 14);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
    doc.text(String(r[1] || "").slice(0, 44), M + labW + 6, ry + 14);
  });
  y += 2 * rH + 16;

  const cols = [
    ["Date of Trip", 70], ["Name of Starting Location", 80], ["Address of Starting Location", 104],
    ["Name of Ending Location", 80], ["Address of Ending Location", 104], ["Round Trip?", 40], ["Mileage (per GPS)", 54],
  ];
  const xs = []; { let x = M; cols.forEach(c => { xs.push(x); x += c[1]; }); }

  const headH = 30;
  doc.setFillColor(...GREEN); doc.rect(M, y, CW, headH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
  cols.forEach((c, i) => doc.text(doc.splitTextToSize(c[0], c[1] - 6), xs[i] + 3, y + 11));

  let ry = y + headH;
  doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(7.5);
  const pageBottom = 792 - 40;
  const drawRow = (vals, zebra) => {
    const cl = vals.map((v, i) => doc.splitTextToSize(String(v || ""), cols[i][1] - 6));
    const h = Math.max(22, Math.max(1, ...cl.map(l => l.length)) * 9 + 8);
    if (ry + h > pageBottom) { doc.addPage(); ry = 48; }
    if (zebra) { doc.setFillColor(...ZEBRA); doc.rect(M, ry, CW, h, "F"); }
    doc.setDrawColor(...GRID);
    cols.forEach((c, i) => { doc.rect(xs[i], ry, c[1], h); doc.text(cl[i], xs[i] + 3, ry + 11); });
    ry += h;
  };
  trips.forEach((t, i) => drawRow(
    [t.date, t.startName, t.startAddr, t.endName, t.endAddr, t.roundTrip ? "Yes" : "", (t.miles || t.miles === 0) ? String(t.miles) : ""],
    i % 2 === 1));
  const blanks = Math.max(0, 3 - 0);
  for (let i = 0; i < blanks; i++) drawRow(["", "", "", "", "", "", ""], (trips.length + i) % 2 === 1);

  ry += 20;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text("Total Miles", xs[6] - 10, ry, { align: "right" });
  doc.text(String(totalMiles), M + CW, ry, { align: "right" }); ry += 18;
  doc.text(`Reimbursement Total ($${rate.toFixed(2)} per mile)`, xs[6] - 10, ry, { align: "right" });
  doc.setTextColor(...NAVY); doc.text(`$${total.toFixed(2)}`, M + CW, ry, { align: "right" }); ry += 28;

  doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text("Travel Reimbursement Reminders:", M, ry); ry += 14;
  doc.setFont("helvetica", "normal"); doc.setTextColor(69, 80, 106); doc.setFontSize(8);
  [
    "1. Acceptable entries for the starting and ending location names are \"Home\" or participating EFA service providers.",
    "2. Only trips where the child is present can be requested. A return trip without the child is not eligible.",
    "3. You can only be reimbursed once per trip, even if multiple kids are in the car.",
    "4. Travel reimbursement is limited to 25% of annual disbursement per year.",
  ].forEach(line => { const l = doc.splitTextToSize(line, CW); doc.text(l, M, ry); ry += l.length * 10 + 2; });

  return doc;
}

import { NextResponse } from "next/server";

// Build marker — visit /api/version on the live site to confirm which code is
// actually deployed. If this returns the version below, the deploy took and the
// Ann/admin/rules updates are live too. If it 404s or shows an older version,
// the deploy did NOT apply. Bump `version` whenever you want a fresh checkpoint.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: "2026-11-17-mileage-pdf-jpeg",
    note: "Mileage Log (/dashboard/mileage): manual trip entry, import the state's .xlsx form, Calculate miles from addresses via Google Routes API (needs GOOGLE_MAPS_API_KEY + Routes API). Totals at $0.52/mile. Exports a VECTOR PDF (jsPDF, PDF 1.3) OR a JPEG — both confirmed to pass ClassWallet's uploader (the imageType error is caused by the state's PDF 1.7 export, which its OCR can't parse). Prominent dashboard card + quick-action, stacked trip cards. Ann updated.",
    served_at: new Date().toISOString(),
  });
}

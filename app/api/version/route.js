import { NextResponse } from "next/server";

// Build marker — visit /api/version on the live site to confirm which code is
// actually deployed. If this returns the version below, the deploy took and the
// Ann/admin/rules updates are live too. If it 404s or shows an older version,
// the deploy did NOT apply. Bump `version` whenever you want a fresh checkpoint.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: "2026-11-17-mileage-address-calc",
    note: "Mileage Log (/dashboard/mileage): manual trip entry, import the state's .xlsx form, and now Calculate miles from start/end addresses via Google Distance Matrix (needs GOOGLE_MAPS_API_KEY). Totals at $0.52/mile, exports an image PDF/JPEG that beats ClassWallet's 'imageType undefined' OCR error. Prominent dashboard card + quick-action. Stacked (no-cutoff) trip cards. Ann updated.",
    served_at: new Date().toISOString(),
  });
}

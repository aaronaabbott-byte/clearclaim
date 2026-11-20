import { NextResponse } from "next/server";

// Build marker — visit /api/version on the live site to confirm which code is
// actually deployed. If this returns the version below, the deploy took and the
// Ann/admin/rules updates are live too. If it 404s or shows an older version,
// the deploy did NOT apply. Bump `version` whenever you want a fresh checkpoint.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: "2026-11-19-mileage-caps-staff",
    note: "Mileage Log now saves as a per-student travel claim (Transportation, or Extracurricular for field trips) so it counts against the student's 25% cap — with a live cap bar in the tool. Needs migration: supabase/mileage-claim-migration.sql (adds claims.miles, claims.mileage_trips). Admin dashboard gets a 'Mileage logged' card (total miles + reimbursement + families, 30-day + all-time). Still: import state .xlsx, Google Routes address lookup, vector PDF 1.3 / JPEG export that passes ClassWallet.",
    served_at: new Date().toISOString(),
  });
}

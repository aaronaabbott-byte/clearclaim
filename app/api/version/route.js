import { NextResponse } from "next/server";

// Build marker — visit /api/version on the live site to confirm which code is
// actually deployed. If this returns the version below, the deploy took and the
// Ann/admin/rules updates are live too. If it 404s or shows an older version,
// the deploy did NOT apply. Bump `version` whenever you want a fresh checkpoint.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: "2026-09-24-ann-directory-and-usage",
    note: "Ann staff directory + withdrawal form, price guide, prior-year receipts, admin Usage card.",
    served_at: new Date().toISOString(),
  });
}

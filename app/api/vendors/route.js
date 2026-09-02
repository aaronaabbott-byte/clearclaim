import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStateConfig } from "@/lib/states";
import { findVendors, VENDOR_COUNT, VENDOR_UPDATED } from "@/lib/vendors";

// Vendor lookup. The list is Arkansas-specific (ClassWallet), so this is gated
// to Arkansas accounts — other states get an empty result.
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ results: [], error: "unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  const cfg = getStateConfig((prof?.state || "AR").toUpperCase());
  if (!cfg?.features?.vendorDirectory) return NextResponse.json({ results: [], gated: true });

  const q = (new URL(request.url).searchParams.get("q") || "").slice(0, 120);
  const results = findVendors(q, 40);
  return NextResponse.json({ results, count: VENDOR_COUNT, updated: VENDOR_UPDATED });
}

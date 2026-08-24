import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Open Stripe's hosted billing portal so a subscriber can update their card,
// switch plans, or cancel. We look up their saved Stripe customer id (written by
// the webhook after the first checkout) and hand them a one-time portal link.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 503 });

  const { data: ent } = await admin.from("entitlements").select("stripe_customer_id").eq("user_id", user.id).single();
  if (!ent?.stripe_customer_id)
    return NextResponse.json({ error: "No billing account yet. Subscribe first." }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: ent.stripe_customer_id,
      return_url: `${base}/upgrade`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

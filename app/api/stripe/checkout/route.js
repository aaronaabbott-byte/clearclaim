import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceIdFor, VALID_TIERS, VALID_INTERVALS } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Start a Stripe Checkout for one plan. The browser sends only { tier, interval };
// the server maps that to a real Price ID (so the amount can't be tampered with),
// reuses the user's Stripe customer if we have one, and stamps the subscription
// with user_id + tier so the webhook knows who to grant and which tier.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing isn't set up yet. Email clearclaimhelp@gmail.com." }, { status: 503 });

  const { tier, interval } = await request.json().catch(() => ({}));
  if (!VALID_TIERS.includes(tier) || !VALID_INTERVALS.includes(interval))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const price = priceIdFor(tier, interval);
  if (!price) return NextResponse.json({ error: `No price configured for ${tier}/${interval}.` }, { status: 503 });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  // Reuse an existing Stripe customer for this user if we already made one.
  const admin = createAdminClient();
  let customerId = null;
  if (admin) {
    const { data: ent } = await admin.from("entitlements").select("stripe_customer_id").eq("user_id", user.id).single();
    customerId = ent?.stripe_customer_id || null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, tier } },
      metadata: { user_id: user.id, tier },
      allow_promotion_codes: true,
      success_url: `${base}/dashboard?upgraded=1`,
      cancel_url: `${base}/upgrade`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, tierForPriceId } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe calls this URL after payments and subscription changes. It's the ONLY
// path (besides comp codes and the admin) that grants paid access. We verify the
// signature so nobody can forge a "you're premium now" call, then write the
// entitlement with the service role (bypasses RLS; the user can't do this).

const today = () => new Date().toISOString().slice(0, 10);
const dateFromUnix = (s) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : today());
const GRANT_STATES = new Set(["active", "trialing", "past_due"]);

// current_period_end lives on the subscription in older API versions, but moved
// onto the line items in newer ones (2025+). Read whichever is present so the
// grant date is correct regardless of the account's / endpoint's API version.
const periodEndUnix = (sub) =>
  sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;

// Set one tier's expiry on a user's entitlement without disturbing the other
// tier. Upsert only touches the columns we pass, so the other *_until survives.
async function setTier(admin, { userId, tier, until, customerId }) {
  if (!userId || !tier) return;
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  if (tier === "family") row.family_until = until;
  if (tier === "provider") row.provider_until = until;
  if (customerId) row.stripe_customer_id = customerId;
  await admin.from("entitlements").upsert(row);
}

// Work out who + which tier a subscription belongs to. Prefer the metadata we
// stamped at checkout; fall back to the price id and the customer lookup.
async function resolve(admin, sub) {
  let userId = sub.metadata?.user_id || null;
  let tier = sub.metadata?.tier || tierForPriceId(sub.items?.data?.[0]?.price?.id) || null;
  if (!userId && sub.customer) {
    const { data } = await admin.from("entitlements").select("user_id").eq("stripe_customer_id", sub.customer).single();
    userId = data?.user_id || null;
  }
  return { userId, tier };
}

export async function POST(request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no_service_role" }, { status: 503 });

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `bad_signature: ${e.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id || null;
        const tier = session.metadata?.tier || null;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        // Pull the subscription to get the real period end.
        let until = today();
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          until = dateFromUnix(periodEndUnix(sub));
          const r = await resolve(admin, sub);
          await setTier(admin, { userId: userId || r.userId, tier: tier || r.tier, until, customerId });
        } else {
          await setTier(admin, { userId, tier, until, customerId });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const { userId, tier } = await resolve(admin, sub);
        const grant = GRANT_STATES.has(sub.status) && !(sub.status === "canceled");
        const until = grant ? dateFromUnix(periodEndUnix(sub)) : today();
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        await setTier(admin, { userId, tier, until, customerId });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { userId, tier } = await resolve(admin, sub);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        // Let access run to the end of the paid period, then it lapses.
        await setTier(admin, { userId, tier, until: dateFromUnix(periodEndUnix(sub)), customerId });
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

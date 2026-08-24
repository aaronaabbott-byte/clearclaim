import Stripe from "stripe";

// Server-only Stripe client. The secret key never has a NEXT_PUBLIC prefix, so
// it is never shipped to the browser. Returns null when unconfigured so routes
// can respond with a clear "not set up yet" message instead of crashing.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Which env var holds the Stripe Price ID for each (tier, interval). The client
// only ever sends a tier + interval; the server resolves the real price here,
// so a user can never checkout at a price they picked.
const PRICE_ENV = {
  family: { month: "STRIPE_PRICE_FAMILY_MONTHLY", year: "STRIPE_PRICE_FAMILY_YEARLY" },
  provider: { month: "STRIPE_PRICE_PROVIDER_MONTHLY", year: "STRIPE_PRICE_PROVIDER_YEARLY" },
};

export function priceIdFor(tier, interval) {
  const envName = PRICE_ENV[tier]?.[interval];
  return envName ? process.env[envName] || null : null;
}

// Reverse lookup: given a Stripe price id (from a webhook), which tier is it?
// Used to know whether to grant family_until or provider_until.
export function tierForPriceId(priceId) {
  for (const [tier, intervals] of Object.entries(PRICE_ENV)) {
    for (const envName of Object.values(intervals)) {
      if (priceId && process.env[envName] === priceId) return tier;
    }
  }
  return null;
}

export const VALID_TIERS = ["family", "provider"];
export const VALID_INTERVALS = ["month", "year"];

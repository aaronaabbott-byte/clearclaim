import { createClient } from "@/lib/supabase/server";

// Free-tier limits.
export const FREE_STUDENTS = 1;
export const FREE_RECEIPTS = 10;

// An entitlement date is active if it's today or later.
export function planActive(d) {
  return !!d && String(d) >= new Date().toISOString().slice(0, 10);
}
// `free_family` is set on the entitlement by a DB trigger for free-Family states
// (Arkansas): those families get the Family plan without paying. Providers still
// pay everywhere.
//
// Belt-and-suspenders: if the caller passes the account's `state`, Arkansas (and
// an unset/blank state, which the whole app defaults to Arkansas) counts as
// free-Family in code too — so AR families are never wrongly dropped to Free if
// the DB trigger/migration hasn't been applied yet. Callers that pass no state
// argument keep the old behavior (rely on the free_family flag only).
export function planFrom(ent, state) {
  const paidFamily = planActive(ent?.family_until);
  let freeByState = false;
  if (arguments.length >= 2) {
    const st = (state == null || state === "") ? "AR" : String(state).toUpperCase();
    freeByState = st === "AR";
  }
  const isFree = !!ent?.free_family || freeByState;
  return {
    family: paidFamily || isFree,
    provider: planActive(ent?.provider_until),
    freeFamily: isFree && !paidFamily,
  };
}

// Server helper: the current user's plan. For gating API routes.
export async function userPlan() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, plan: { family: false, provider: false } };
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  return { user, plan: planFrom(ent) };
}

export const PREMIUM = { premium: true, message: "This is a premium feature. Upgrade to unlock AI and the full toolkit." };

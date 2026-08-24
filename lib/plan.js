import { createClient } from "@/lib/supabase/server";

// Free-tier limits.
export const FREE_STUDENTS = 1;
export const FREE_RECEIPTS = 10;

// An entitlement date is active if it's today or later.
export function planActive(d) {
  return !!d && String(d) >= new Date().toISOString().slice(0, 10);
}
export function planFrom(ent) {
  return { family: planActive(ent?.family_until), provider: planActive(ent?.provider_until) };
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

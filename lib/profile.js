import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import { getStateConfig } from "@/lib/states";

// Load the signed-in user, their profile (roles + provider business info), and
// their paid plan. If no profile row exists yet, create a default parent one so
// every account always has one. Safe to call from any server component.
export async function getProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, plan: { family: false, provider: false } };

  let { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, is_parent: true, is_provider: false })
      .select("*")
      .single();
    profile = data || { user_id: user.id, is_parent: true, is_provider: false };
  }
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const state = (profile?.state || "AR").toUpperCase();
  return { user, profile, plan: planFrom(ent), state, stateConfig: getStateConfig(state) };
}

// Does the provider have enough filled in to brand a document?
export function providerReady(p) {
  return !!(p && p.is_provider && (p.business_name || p.provider_name));
}

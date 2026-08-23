import { createClient } from "@/lib/supabase/server";

// Load the signed-in user and their profile (roles + provider business info).
// If no profile row exists yet, create a default parent profile so every
// account always has one. Safe to call from any server component.
export async function getProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  let { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, is_parent: true, is_provider: false })
      .select("*")
      .single();
    profile = data || { user_id: user.id, is_parent: true, is_provider: false };
  }
  return { user, profile };
}

// Does the provider have enough filled in to brand a document?
export function providerReady(p) {
  return !!(p && p.is_provider && (p.business_name || p.provider_name));
}

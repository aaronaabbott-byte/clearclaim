import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. This bypasses row-level security and can read
// or delete ANY user's data, so it must only ever be created and used on the
// server (server components / server actions). The key has no NEXT_PUBLIC
// prefix, so Next will never bundle it into the browser. Returns null if the
// key is not configured, so callers can show a setup message instead of crashing.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

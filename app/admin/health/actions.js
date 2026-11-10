"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

// Move a cluster between triage states. "acknowledged" = you've seen it and it
// stops nagging; "resolved" = handled; "open" = reopen. Never deletes events.
export async function setClusterStatus(signature, status) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  if (!["open", "acknowledged", "resolved"].includes(status)) return { ok: false, error: "Bad status." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role not configured." };
  const { error } = await admin.from("error_clusters").update({ status }).eq("signature", signature);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/health");
  return { ok: true };
}

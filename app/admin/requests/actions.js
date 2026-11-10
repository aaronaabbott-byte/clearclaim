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

// Move a request between states. "shipped" and "dismissed" drop it from the
// open list and the weekly digest (auto-close). If families hit it again after
// it's shipped, capture reopens it automatically.
export async function setRequestStatus(signature, status) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  if (!["open", "planned", "shipped", "dismissed"].includes(status)) return { ok: false, error: "Bad status." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role not configured." };
  const { error } = await admin.from("feature_requests").update({ status }).eq("signature", signature);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/requests");
  return { ok: true };
}

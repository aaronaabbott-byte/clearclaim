"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// Every admin action re-verifies the caller server-side. Server actions are
// directly callable endpoints, so gating only the page is not enough.
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

// Wipe one account's data but keep the login (students, claims, pre-approvals,
// syllabi, documents, vendors, and their uploaded files). `confirmEmail` must
// match the target exactly — the UI makes the admin type it, so a stray click
// cannot fire this.
export async function resetAccount(userId, email, confirmEmail) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  if (!email || (confirmEmail || "").trim().toLowerCase() !== email.trim().toLowerCase())
    return { ok: false, error: "Confirmation email did not match." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };

  try {
    // Uploaded files first (documents bucket, foldered by user id).
    const { data: top } = await admin.storage.from("documents").list(userId, { limit: 1000 });
    for (const entry of top || []) {
      const { data: inner } = await admin.storage.from("documents").list(`${userId}/${entry.name}`, { limit: 1000 });
      const paths = (inner || []).map(f => `${userId}/${entry.name}/${f.name}`);
      if (paths.length) await admin.storage.from("documents").remove(paths);
    }
    for (const table of ["claims", "preapprovals", "syllabi", "documents", "vendors", "kids"]) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
    }
    revalidatePath("/admin");
    return { ok: true, message: `Cleared all data for ${email} (login kept).` };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Remove the account entirely (login included). Cascades to the app tables via
// the on-delete-cascade foreign keys; we clear storage first. Same typed
// confirmation guard.
export async function deleteAccount(userId, email, confirmEmail) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  if (caller.id === userId) return { ok: false, error: "You cannot delete your own admin account here." };
  if (!email || (confirmEmail || "").trim().toLowerCase() !== email.trim().toLowerCase())
    return { ok: false, error: "Confirmation email did not match." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };

  try {
    const { data: top } = await admin.storage.from("documents").list(userId, { limit: 1000 });
    for (const entry of top || []) {
      const { data: inner } = await admin.storage.from("documents").list(`${userId}/${entry.name}`, { limit: 1000 });
      const paths = (inner || []).map(f => `${userId}/${entry.name}/${f.name}`);
      if (paths.length) await admin.storage.from("documents").remove(paths);
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true, message: `Deleted the account and all data for ${email}.` };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

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

function monthsFromNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.max(1, parseInt(months, 10) || 12));
  return d.toISOString().slice(0, 10);
}

// Grant or extend a paid plan for an account (comp). tier: family | provider | both.
export async function grantPlan(userId, tier, months) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };
  const until = monthsFromNow(months);
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  if (tier === "family" || tier === "both") row.family_until = until;
  if (tier === "provider" || tier === "both") row.provider_until = until;
  const { error } = await admin.from("entitlements").upsert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: `Granted ${tier} through ${until}.` };
}

// Remove all paid access from an account.
export async function revokePlan(userId) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };
  const { error } = await admin.from("entitlements").upsert({ user_id: userId, family_until: null, provider_until: null, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Paid access removed." };
}

// Create an access / comp code.
export async function createCode({ code, grants, months, maxUses, note }) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };
  const clean = (code || "").trim();
  if (!clean) return { ok: false, error: "Enter a code." };
  const { error } = await admin.from("access_codes").insert({
    code: clean, grants: grants || "family", months: Math.max(1, parseInt(months, 10) || 12),
    max_uses: maxUses ? parseInt(maxUses, 10) : null, note: note || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: `Code "${clean}" created.` };
}

export async function setCodeActive(code, active) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };
  const { error } = await admin.from("access_codes").update({ active }).eq("code", code);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: active ? "Code activated." : "Code deactivated." };
}

// Add or remove the parent / provider roles on an account — for fixing an
// accidental role choice at signup.
export async function setUserRoles(userId, isParent, isProvider) {
  const caller = await requireAdmin();
  if (!caller) return { ok: false, error: "Not authorized." };
  if (!isParent && !isProvider) return { ok: false, error: "Keep at least one role." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key not configured." };
  const { error } = await admin.from("profiles").upsert({ user_id: userId, is_parent: isParent, is_provider: isProvider });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: `Roles updated: ${[isParent && "parent", isProvider && "provider"].filter(Boolean).join(" + ")}.` };
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

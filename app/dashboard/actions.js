"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planFrom, FREE_STUDENTS } from "@/lib/plan";

export async function addKid(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return;
  // Free plan is limited to one student; adding more needs the Family plan.
  // Arkansas families get Family free, so include the account's state in the check.
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  if (!planFrom(ent, prof?.state).family) {
    const { count } = await supabase.from("kids").select("id", { count: "exact", head: true });
    if ((count || 0) >= FREE_STUDENTS) redirect("/upgrade");
  }
  // Core columns that have always existed.
  const base = {
    user_id: user.id,
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
  };
  // Columns added by later migrations. If one of these migrations hasn't been
  // run on this database, inserting its column throws "column ... does not
  // exist" and the whole insert fails. So we try the full insert, and if it
  // errors we retry with just the core columns — the student still gets added
  // rather than silently failing.
  const extras = {
    program_start_year: parseInt(formData.get("program_start_year"), 10) || null,
    prior_tech: (formData.get("prior_tech") || "").trim() || null,
    award_amount: Number(formData.get("award_amount")) || null,
  };
  let { error } = await supabase.from("kids").insert({ ...base, ...extras });
  if (error) ({ error } = await supabase.from("kids").insert(base));
  if (error) throw new Error("Could not add student: " + error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateKid(formData) {
  const supabase = createClient();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return;
  const id = formData.get("id");
  const base = {
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
  };
  const extras = {
    program_start_year: parseInt(formData.get("program_start_year"), 10) || null,
    prior_tech: (formData.get("prior_tech") || "").trim() || null,
  };
  let { error } = await supabase.from("kids").update({ ...base, ...extras }).eq("id", id);
  if (error) ({ error } = await supabase.from("kids").update(base).eq("id", id));
  if (error) throw new Error("Could not save student: " + error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function deleteKid(formData) {
  const supabase = createClient();
  await supabase.from("kids").delete().eq("id", formData.get("id"));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

// Persist a new student display order. `ids` is the full list of kid ids in the
// order the parent arranged them; each row's sort_order is set to its index.
export async function reorderKids(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await Promise.all(ids.map((id, i) =>
    supabase.from("kids").update({ sort_order: i }).eq("id", id).eq("user_id", user.id)
  ));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

// Log spend that never became a full claim (e.g. an approved ClassWallet
// Marketplace order) so it still counts toward the student's caps. Amount is the
// BASE price (pre-tax, pre-shipping).
export async function addCapEntry(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const kid_id = formData.get("kid_id");
  const amount = Number(formData.get("amount"));
  const category = formData.get("category") || null;
  if (!kid_id || !category || !(amount > 0)) return;
  await supabase.from("cap_entries").insert({
    user_id: user.id,
    kid_id,
    category,
    label: (formData.get("label") || "").trim() || null,
    amount,
    entry_date: formData.get("entry_date") || null,
    note: (formData.get("note") || "").trim() || null,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function deleteCapEntry(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("cap_entries").delete()
    .eq("id", formData.get("id")).eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  if (!planFrom(ent).family) {
    const { count } = await supabase.from("kids").select("id", { count: "exact", head: true });
    if ((count || 0) >= FREE_STUDENTS) redirect("/upgrade");
  }
  await supabase.from("kids").insert({
    user_id: user.id,
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
    program_start_year: parseInt(formData.get("program_start_year"), 10) || null,
    prior_tech: (formData.get("prior_tech") || "").trim() || null,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateKid(formData) {
  const supabase = createClient();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return;
  await supabase.from("kids").update({
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
    program_start_year: parseInt(formData.get("program_start_year"), 10) || null,
    prior_tech: (formData.get("prior_tech") || "").trim() || null,
  }).eq("id", formData.get("id"));
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

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addKid(formData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return;
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

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

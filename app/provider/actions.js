"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Flip an invoice between paid and unpaid. RLS ("own invoices") scopes this to
// the signed-in provider's own rows, so no extra ownership check is needed.
export async function setInvoiceStatus(id, status) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const next = status === "paid" ? "paid" : "unpaid";
  const { error } = await supabase.from("invoices")
    .update({ status: next, paid_date: next === "paid" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/provider");
  return { ok: true };
}

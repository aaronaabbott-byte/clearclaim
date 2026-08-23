import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import InvoiceBuilder from "@/app/provider/invoice-builder";

export const dynamic = "force-dynamic";

export default async function EditInvoice({ params }) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");
  const supabase = createClient();
  const { data: existing } = await supabase.from("invoices").select("*").eq("id", params.id).single();
  if (!existing) notFound();
  const { data: items } = await supabase.from("provider_items").select("*").order("created_at");

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider/items"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Products & services</button></Link>
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <InvoiceBuilder userId={user.id} provider={profile} savedItems={items || []} existing={existing} />
      </main>
    </>
  );
}

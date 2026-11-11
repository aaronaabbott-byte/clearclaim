import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import InvoiceBuilder from "@/app/provider/invoice-builder";

export const dynamic = "force-dynamic";

export default async function NewInvoice({ searchParams }) {
  const { user, profile, plan } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");
  if (!plan.provider) redirect("/upgrade");
  const supabase = createClient();
  const { data: items } = await supabase.from("provider_items").select("*").order("created_at");
  const prefill = {
    student: (searchParams?.student || "").toString(),
    parent: (searchParams?.parent || "").toString(),
  };

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider/items"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Products & services</button></Link>
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <InvoiceBuilder userId={user.id} provider={profile} savedItems={items || []} prefill={prefill} />
      </main>
    </>
  );
}

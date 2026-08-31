import Link from "next/link";
import { planFrom } from "@/lib/plan";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryCap, efaBudgetYear, inBudgetYear, capContribution, sumCapEntries } from "@/lib/rules";
import { getProfile } from "@/lib/profile";
import PreapprovalBuilder from "../builder";

export default async function NewPreapproval({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  { const { data: __ent } = await createClient().from("entitlements").select("*").eq("user_id", user.id).single(); if (!planFrom(__ent).family) redirect("/upgrade"); }
  // Pre-approval encodes Arkansas's Department pre-approval flow; only Arkansas accounts see it.
  { const { stateConfig } = await getProfile(); if (!stateConfig?.features?.preapprovalTool) redirect("/dashboard"); }
  const { data: rawKids } = await supabase.from("kids").select("id,first_name,grade,prior_tech")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: claims } = await supabase.from("claims").select("kid_id,category,amount,base_price,date,created_at");
  const { data: capEntries } = await supabase.from("cap_entries").select("*");
  const BY = efaBudgetYear();
  const techUsed = (kidId) => (claims || [])
    .filter(c => c.kid_id === kidId && (categoryCap(c.category) || {}).key === "technology" && inBudgetYear(c, BY))
    .reduce((s, c) => s + capContribution(c), 0)
    + sumCapEntries(capEntries, kidId, "technology", BY);
  const kids = (rawKids || []).map(k => ({ ...k, tech_used: techUsed(k.id) }));
  const seed = (searchParams?.desc || "").toString();

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <PreapprovalBuilder kids={kids || []} userEmail={user.email} existing={seed ? { description: seed } : null} />
      </main>
    </>
  );
}

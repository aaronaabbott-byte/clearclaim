import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryCap, efaBudgetYear, inBudgetYear } from "@/lib/rules";
import PreapprovalBuilder from "../builder";

export default async function EditPreapproval({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawKids } = await supabase.from("kids").select("id,first_name,grade,prior_tech")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: claims } = await supabase.from("claims").select("kid_id,category,amount,date,created_at");
  const BY = efaBudgetYear();
  const techUsed = (kidId) => (claims || [])
    .filter(c => c.kid_id === kidId && (categoryCap(c.category) || {}).key === "technology" && inBudgetYear(c, BY))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const kids = (rawKids || []).map(k => ({ ...k, tech_used: techUsed(k.id) }));
  const { data: existing } = await supabase.from("preapprovals").select("*").eq("id", params.id).single();
  if (!existing) notFound();

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="46" style={{ background: "#fff", borderRadius: 10, padding: "6px 13px", display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <PreapprovalBuilder kids={kids || []} userEmail={user.email} existing={existing} />
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryCap, efaBudgetYear, inBudgetYear } from "@/lib/rules";
import PreapprovalBuilder from "../builder";

export default async function NewPreapproval({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawKids } = await supabase.from("kids").select("id,first_name,grade,prior_tech").order("created_at");
  const { data: claims } = await supabase.from("claims").select("kid_id,category,amount,date,created_at");
  const BY = efaBudgetYear();
  const techUsed = (kidId) => (claims || [])
    .filter(c => c.kid_id === kidId && (categoryCap(c.category) || {}).key === "technology" && inBudgetYear(c, BY))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const kids = (rawKids || []).map(k => ({ ...k, tech_used: techUsed(k.id) }));
  const seed = (searchParams?.desc || "").toString();

  return (
    <>
      <header>
        <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
        <h1>ClearClaim</h1>
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <PreapprovalBuilder kids={kids || []} userEmail={user.email} existing={seed ? { description: seed } : null} />
      </main>
    </>
  );
}

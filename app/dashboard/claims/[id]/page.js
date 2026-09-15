import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import { getStateConfig } from "@/lib/states";
import ClaimBuilder from "../builder";

// Reopen a saved claim to edit it — add more, tweak the amount, re-download the
// packet — without starting over.
export default async function EditClaim({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const premium = planFrom(ent).family;
  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  const cfg = getStateConfig(prof?.state);

  const { data: existing } = await supabase.from("claims").select("*").eq("id", params.id).single();
  if (!existing) notFound();

  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  // Exclude this claim from the running-cap math so it isn't counted twice.
  const { data: allClaims } = await supabase.from("claims").select("id,kid_id,category,amount,base_price,date,created_at");
  const claims = (allClaims || []).filter(c => c.id !== existing.id);
  const { data: documents } = await supabase.from("documents").select("id,kid_id,label,kind,path,filename").order("created_at", { ascending: false });

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <ClaimBuilder kids={kids || []} userId={user.id} claims={claims} documents={documents || []}
          existing={existing} premium={premium}
          state={cfg.code} categories={cfg.categories} pathways={cfg.pathways} pathwayFields={cfg.pathwayFields} features={cfg.features} />
      </main>
    </>
  );
}

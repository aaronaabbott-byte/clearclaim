import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import ClaimBuilder from "../builder";

export default async function NewClaim({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const premium = planFrom(ent).family;
  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: claims } = await supabase.from("claims").select("id,kid_id,category,amount,date,created_at");
  const initialItems = (searchParams?.items || "").toString();
  const initialNote = (searchParams?.note || "").toString();
  const prefill = {
    kidId: (searchParams?.kid || "").toString(),
    vendor: (searchParams?.vendor || "").toString(),
    amount: (searchParams?.amount || "").toString(),
    category: (searchParams?.category || "").toString(),
  };

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <ClaimBuilder kids={kids || []} userId={user.id} claims={claims || []}
          initialItems={initialItems} initialNote={initialNote} prefill={prefill} premium={premium} />
      </main>
    </>
  );
}

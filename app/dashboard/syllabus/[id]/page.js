import Link from "next/link";
import { planFrom } from "@/lib/plan";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SyllabusBuilder from "../builder";

export default async function EditSyllabus({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  { const { data: __ent } = await createClient().from("entitlements").select("*").eq("user_id", user.id).single(); if (!planFrom(__ent).family) redirect("/upgrade"); }
  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: existing } = await supabase.from("syllabi").select("*").eq("id", params.id).single();
  if (!existing) notFound();

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <SyllabusBuilder kids={kids || []} userId={user.id} existing={existing} />
      </main>
    </>
  );
}

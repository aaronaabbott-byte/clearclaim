import Link from "next/link";
import { planFrom } from "@/lib/plan";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Annotator from "./annotator";

export default async function Annotate() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  { const { data: __ent } = await createClient().from("entitlements").select("*").eq("user_id", user.id).single(); if (!planFrom(__ent).family) redirect("/upgrade"); }

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <Annotator userId={user.id} />
      </main>
    </>
  );
}

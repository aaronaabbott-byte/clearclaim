import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { config } from "@/lib/classify";
import Eligibility from "./eligibility";

export default async function EligibilityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("id,first_name,program_start_year")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <>
      <header>
        <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
        <h1>ClearClaim</h1>
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <Eligibility kids={kids || []} ruleVersion={config.ruleVersion} />
      </main>
    </>
  );
}

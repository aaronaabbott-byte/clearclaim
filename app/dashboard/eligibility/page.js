import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { config } from "@/lib/classify";
import { getProfile } from "@/lib/profile";
import Eligibility from "./eligibility";

export default async function EligibilityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // The core/non-core eligibility tool encodes Arkansas rules, so it is only
  // available to Arkansas accounts. Other states are sent back to the dashboard.
  const { stateConfig } = await getProfile();
  if (!stateConfig?.features?.coreNonCore) redirect("/dashboard");
  const { data: kids } = await supabase.from("kids").select("id,first_name,program_start_year")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <Eligibility kids={kids || []} ruleVersion={config.ruleVersion} />
      </main>
    </>
  );
}

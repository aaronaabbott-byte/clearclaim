import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planFrom } from "@/lib/plan";
import { getProfile } from "@/lib/profile";
import FixDenied from "./fix";

// "Fix a denied submission" — standalone tool. Arkansas-only, since the denial→fix
// mapping is built on verified Arkansas EFA / ClassWallet guidance.
export default async function FixPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { stateConfig } = await getProfile();
  if (!stateConfig?.features?.denialFixer) redirect("/dashboard");
  const { data: ent } = await supabase.from("entitlements").select("*").eq("user_id", user.id).single();
  const premium = planFrom(ent).family;

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <FixDenied categories={stateConfig.categories || []} premium={premium} />
      </main>
    </>
  );
}

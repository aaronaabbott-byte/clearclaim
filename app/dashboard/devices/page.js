import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DevicesManager from "./devices";

// Devices & protection plans — store the receipt and out-of-pocket plan paperwork
// with each device. State-agnostic (protection plans aren't program-specific).
export default async function DevicesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: devices } = await supabase.from("devices").select("*").order("created_at", { ascending: false });
  const { data: kids } = await supabase.from("kids").select("id,first_name")
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
        <DevicesManager userId={user.id} devices={devices || []} kids={kids || []} />
      </main>
    </>
  );
}

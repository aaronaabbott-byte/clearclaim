import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStateConfig } from "@/lib/states";
import MileageBuilder from "./builder";

export const dynamic = "force-dynamic";

export default async function MileagePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  const cfg = getStateConfig(prof?.state);
  const { data: kids } = await supabase.from("kids").select("first_name,last_name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const students = (kids || []).map(k => [k.first_name, k.last_name].filter(Boolean).join(" ")).filter(Boolean);

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        {cfg.code === "AR" ? (
          <MileageBuilder students={students} defaultStudent={students[0] || ""} />
        ) : (
          <div className="card">
            <h2>Mileage log</h2>
            <p className="sans" style={{ fontSize: 14, color: "#3c4048" }}>
              The mileage log is set up for Arkansas's $0.52/mile travel reimbursement and its Travel Reimbursement
              Request Form. It isn't available for {cfg.name || "your state"} yet. If your state reimburses travel and
              you'd like this here, let us know from the dashboard.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FREE_FEATURES, FAMILY_FEATURES, PROVIDER_FEATURES } from "@/lib/plans";
import StatePicker from "./state-picker";

export const dynamic = "force-dynamic";

function Box({ title, price, per, features, accent, children }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 250, borderColor: accent ? "var(--gold)" : "var(--line)", borderWidth: accent ? 2 : 1, display: "flex", flexDirection: "column" }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div className="sans" style={{ margin: "6px 0 12px" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: "var(--navy)" }}>{price}</span>
        <span className="muted" style={{ fontSize: 14 }}> {per}</span>
      </div>
      <ul className="sans" style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18, margin: 0, color: "var(--ink)", flex: 1 }}>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      {children}
    </div>
  );
}

export default async function Welcome({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();

  const raw = searchParams?.next || "/dashboard";
  const next = typeof raw === "string" && raw.startsWith("/") ? raw : "/dashboard";

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href={next}><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Skip →</button></Link>
      </header>
      <main>
        <div className="card" style={{ textAlign: "center", background: "linear-gradient(180deg,#f2f6fb,#fff)", borderColor: "var(--navy2)" }}>
          <h2 style={{ margin: 0 }}>Welcome to ClearClaim 🎉</h2>
          <p className="muted sans" style={{ fontSize: 14.5, maxWidth: 580, margin: "8px auto 0" }}>
            You're all set on the free plan — no card needed. First, tell us which program you're in, then
            pick a plan.
          </p>
        </div>

        <div className="card">
          <h2 style={{ margin: 0 }}>Which state's program are you in?</h2>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 4, marginBottom: 14 }}>
            Tap your state on the map. ClearClaim tailors categories, caps, and documentation to your program.
            Arkansas and Arizona are live now — more states are coming.
          </p>
          <StatePicker userId={user.id} current={profile?.state || "AR"} />
        </div>

        <div className="row" style={{ marginTop: 4, alignItems: "stretch" }}>
          <Box title="Free" price="$0" per="always free" features={FREE_FEATURES}>
            <Link href={next} style={{ marginTop: 14 }}><button style={{ width: "100%" }}>Continue on the free plan</button></Link>
          </Box>
          <Box title="Family" price="$10" per="/mo — or $99/yr" features={FAMILY_FEATURES} accent>
            <Link href="/upgrade" style={{ marginTop: 14 }}><button className="primary" style={{ width: "100%" }}>Upgrade to Family</button></Link>
          </Box>
          <Box title="Provider" price="$19" per="/mo — or $189/yr" features={PROVIDER_FEATURES}>
            <Link href="/upgrade" style={{ marginTop: 14 }}><button className="primary" style={{ width: "100%" }}>Upgrade to Provider</button></Link>
          </Box>
        </div>

        <p className="muted sans" style={{ fontSize: 13, textAlign: "center", marginTop: 14 }}>
          You can change plans any time from the menu → Plans &amp; billing. Cancel whenever you like.
        </p>
      </main>
    </>
  );
}

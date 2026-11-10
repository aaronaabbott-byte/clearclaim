import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import RequestRow from "./rows";

export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/admin"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Admin</button></Link>
      </header>
      <main>{children}</main>
    </>
  );
}

export default async function Requests() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) notFound();
  const admin = createAdminClient();
  if (!admin) return <Shell><div className="card"><h2>Feature requests</h2><p className="sans">Service-role key not configured.</p></div></Shell>;

  const { data: all } = await admin.from("feature_requests")
    .select("*").order("count", { ascending: false }).limit(300);
  const active = (all || []).filter(r => r.status === "open" || r.status === "planned");
  const closed = (all || []).filter(r => r.status === "shipped" || r.status === "dismissed");

  return (
    <Shell>
      <div className="card">
        <h2>Feature requests</h2>
        <p className="muted sans" style={{ fontSize: 13, marginTop: -4 }}>
          Gaps families hit — Ann couldn't answer, a denial reason the fixer didn't recognize, or a direct request.
          Similar hits are grouped with a running count, so the most-requested things rise to the top. A weekly digest
          emails the admins what's new or growing. Marking something Shipped or Dismissed closes it (it reopens if families hit it again).
        </p>
      </div>

      <div className="card">
        <h2>Open &amp; planned {active.length > 0 && <span className="muted">({active.length})</span>}</h2>
        {active.length === 0
          ? <p className="muted sans" style={{ fontSize: 14 }}>Nothing yet. 🎉</p>
          : <div style={{ display: "grid", gap: 8 }}>{active.map(r => <RequestRow key={r.signature} r={r} />)}</div>}
      </div>

      {closed.length > 0 && (
        <div className="card">
          <h2>Shipped &amp; dismissed</h2>
          <div style={{ display: "grid", gap: 8 }}>{closed.map(r => <RequestRow key={r.signature} r={r} />)}</div>
        </div>
      )}
    </Shell>
  );
}

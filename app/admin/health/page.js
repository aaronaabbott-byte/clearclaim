import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import HealthRow from "./rows";

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

export default async function Health() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) notFound();
  const admin = createAdminClient();
  if (!admin) return <Shell><div className="card"><h2>Health</h2><p className="sans">Service-role key not configured.</p></div></Shell>;

  const { data: clusters } = await admin.from("error_clusters")
    .select("*").order("status", { ascending: true }).order("last_seen", { ascending: false }).limit(200);
  const { data: recentNotifs } = await admin.from("notification_log")
    .select("kind, sent_at").order("sent_at", { ascending: false }).limit(500);

  const open = (clusters || []).filter(c => c.status === "open");
  const other = (clusters || []).filter(c => c.status !== "open");
  const notifCounts = {};
  for (const n of recentNotifs || []) notifCounts[n.kind] = (notifCounts[n.kind] || 0) + 1;

  return (
    <Shell>
      <div className="card">
        <h2>System health</h2>
        <p className="muted sans" style={{ fontSize: 13, marginTop: -4 }}>
          The health check runs every ~20 minutes: it groups errors, applies only the safe, reversible fixes on its own,
          and flags recurring ones here (and emails the admins). Everything that changes code, data, rules, or money waits for you.
        </p>
      </div>

      <div className="card">
        <h2>Recent notifications sent</h2>
        {Object.keys(notifCounts).length === 0
          ? <p className="muted sans" style={{ fontSize: 14 }}>None yet.</p>
          : <p className="sans" style={{ fontSize: 14 }}>{Object.entries(notifCounts).map(([k, v]) => `${v} ${k}`).join(" · ")} <span className="muted">(last 500)</span></p>}
      </div>

      <div className="card">
        <h2>Needs attention {open.length > 0 && <span style={{ color: "#c0392b" }}>({open.length})</span>}</h2>
        {open.length === 0
          ? <p className="muted sans" style={{ fontSize: 14 }}>Nothing open. 🎉</p>
          : <div style={{ display: "grid", gap: 8 }}>{open.map(c => <HealthRow key={c.signature} c={c} />)}</div>}
      </div>

      {other.length > 0 && (
        <div className="card">
          <h2>Acknowledged / resolved / auto-fixed</h2>
          <div style={{ display: "grid", gap: 8 }}>{other.map(c => <HealthRow key={c.signature} c={c} />)}</div>
        </div>
      )}
    </Shell>
  );
}

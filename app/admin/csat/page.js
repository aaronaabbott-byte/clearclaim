import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

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

export default async function Csat() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) notFound();
  const admin = createAdminClient();
  if (!admin) return <Shell><div className="card"><h2>Satisfaction</h2><p className="sans">Service-role key not configured.</p></div></Shell>;

  const { data: rows } = await admin.from("csat_responses")
    .select("score, comment, created_at").order("created_at", { ascending: false }).limit(1000);
  const all = rows || [];
  const n = all.length;
  const avg = n ? (all.reduce((s, r) => s + r.score, 0) / n) : 0;
  const dist = [1, 2, 3, 4, 5].map(s => all.filter(r => r.score === s).length);
  const since30 = Date.now() - 30 * 86400000;
  const recent = all.filter(r => new Date(r.created_at).getTime() >= since30);
  const recentAvg = recent.length ? (recent.reduce((s, r) => s + r.score, 0) / recent.length) : 0;
  const comments = all.filter(r => (r.comment || "").trim()).slice(0, 50);
  const maxBar = Math.max(1, ...dist);

  return (
    <Shell>
      <div className="card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Satisfaction (CSAT)</h2>
          <span className="muted sans" style={{ fontSize: 13 }}>1–5 stars</span>
        </div>
        {n === 0 ? (
          <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>No responses yet.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
              <div><div style={{ fontSize: 30, fontWeight: 700, color: "#15264b" }}>{avg.toFixed(2)}</div><div className="muted sans" style={{ fontSize: 12.5 }}>avg · {n} responses</div></div>
              <div><div style={{ fontSize: 30, fontWeight: 700, color: "#15264b" }}>{recent.length ? recentAvg.toFixed(2) : "—"}</div><div className="muted sans" style={{ fontSize: 12.5 }}>last 30 days · {recent.length}</div></div>
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 6, maxWidth: 420 }}>
              {[5, 4, 3, 2, 1].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="sans" style={{ width: 28, fontSize: 13, color: "#45506a" }}>{s}★</span>
                  <div style={{ flex: 1, background: "#eef1f7", borderRadius: 6, height: 14 }}>
                    <div style={{ width: `${(dist[s - 1] / maxBar) * 100}%`, background: "#f0a500", height: "100%", borderRadius: 6 }} />
                  </div>
                  <span className="muted sans" style={{ width: 28, fontSize: 12.5, textAlign: "right" }}>{dist[s - 1]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {comments.length > 0 && (
        <div className="card">
          <h2>Comments</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {comments.map((r, i) => (
              <div key={i} className="kid" style={{ display: "block", padding: "10px 13px" }}>
                <div className="sans" style={{ fontSize: 12.5, color: "#f0a500", marginBottom: 2 }}>
                  {"★".repeat(r.score)}<span style={{ color: "#d4dae6" }}>{"★".repeat(5 - r.score)}</span>
                  <span className="muted" style={{ color: "#8792a8", marginLeft: 8 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="sans" style={{ fontSize: 13.5, color: "#1f2a44" }}>{r.comment}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

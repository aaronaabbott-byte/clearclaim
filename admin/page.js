import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import AdminRow from "./admin-rows";
import AdminCodes from "./admin-codes";
import StatsExport from "./stats-export";

export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>{children}</main>
    </>
  );
}

export default async function Admin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Not an admin: behave as if the page does not exist.
  if (!isAdmin(user.email)) notFound();

  const admin = createAdminClient();
  if (!admin) {
    return (
      <Shell>
        <div className="card">
          <h2>Admin</h2>
          <p className="sans" style={{ fontSize: 14 }}>
            The admin panel needs the Supabase service-role key to read all accounts. Add
            <b> SUPABASE_SERVICE_ROLE_KEY</b> (from Supabase → Settings → API) as a server-side
            environment variable in Vercel, then redeploy. Keep that key secret and never prefix it with NEXT_PUBLIC.
          </p>
        </div>
      </Shell>
    );
  }

  // Pull all accounts, then per-user counts (service role bypasses RLS).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const [{ data: kids }, { data: claims }, { data: preapprovals }, { data: profiles },
    { data: classes }, { data: invoices }, { data: syllabi }, { data: pItems },
    { data: ents }, { data: codes }, { data: documents }, { data: devices }] = await Promise.all([
    admin.from("kids").select("user_id,created_at"),
    admin.from("claims").select("user_id,created_at,status"),
    admin.from("preapprovals").select("user_id,created_at"),
    admin.from("profiles").select("user_id,is_parent,is_provider,state"),
    admin.from("classes").select("user_id"),
    admin.from("invoices").select("user_id,total"),
    admin.from("syllabi").select("user_id,branded"),
    admin.from("provider_items").select("user_id"),
    admin.from("entitlements").select("*"),
    admin.from("access_codes").select("*").order("created_at", { ascending: false }),
    admin.from("documents").select("user_id"),
    admin.from("devices").select("user_id"),   // table may not exist yet; guarded below
  ]);
  const entMap = {};
  for (const e of ents || []) entMap[e.user_id] = e;
  const tally = (rows) => {
    const m = {};
    for (const r of rows || []) m[r.user_id] = (m[r.user_id] || 0) + 1;
    return m;
  };
  const kMap = tally(kids), cMap = tally(claims), pMap = tally(preapprovals);
  const classMap = tally(classes), itemMap = tally(pItems);
  const invMap = {}, invSum = {};
  for (const r of invoices || []) { invMap[r.user_id] = (invMap[r.user_id] || 0) + 1; invSum[r.user_id] = (invSum[r.user_id] || 0) + (Number(r.total) || 0); }
  const docMap = {};
  for (const r of syllabi || []) if (r.branded) docMap[r.user_id] = (docMap[r.user_id] || 0) + 1;
  const profMap = {};
  for (const p of profiles || []) profMap[p.user_id] = p;

  const users = (list?.users || [])
    .map(u => ({
      id: u.id,
      email: u.email || "(no email)",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      kids: kMap[u.id] || 0,
      claims: cMap[u.id] || 0,
      preapprovals: pMap[u.id] || 0,
      is_parent: profMap[u.id]?.is_parent ?? true,
      is_provider: profMap[u.id]?.is_provider ?? false,
      p_classes: classMap[u.id] || 0,
      p_invoices: invMap[u.id] || 0,
      p_invoice_total: invSum[u.id] || 0,
      p_docs: docMap[u.id] || 0,
      p_items: itemMap[u.id] || 0,
      family_until: entMap[u.id]?.family_until || null,
      provider_until: entMap[u.id]?.provider_until || null,
      free_family: !!entMap[u.id]?.free_family,
      state: profMap[u.id]?.state || null,
    }))
    .sort((a, b) => (b.last_sign_in_at || b.created_at || "").localeCompare(a.last_sign_in_at || a.created_at || ""));

  // ---- Usage stats -----------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const isToday = (d) => d && String(d).slice(0, 10) === today;
  const sinceWeek = (d) => d && String(d) >= weekAgo;
  const cToday = (rows) => (rows || []).filter(r => isToday(r.created_at)).length;
  const cWeek = (rows) => (rows || []).filter(r => sinceWeek(r.created_at)).length;
  const parents = users.filter(u => u.is_parent);
  const accountsWithClaim = Object.keys(cMap).length;
  const activated = parents.length ? Math.round((accountsWithClaim / parents.length) * 100) : 0;
  const stats = {
    accounts: users.length,
    parents: parents.length,
    providers: users.filter(u => u.is_provider).length,
    arFree: users.filter(u => u.free_family || (u.state || "AR").toUpperCase() === "AR").length,
    newToday: users.filter(u => isToday(u.created_at)).length,
    newWeek: users.filter(u => sinceWeek(u.created_at)).length,
    activeToday: users.filter(u => isToday(u.last_sign_in_at)).length,
    activeWeek: users.filter(u => sinceWeek(u.last_sign_in_at)).length,
    students: (kids || []).length,
    claims: (claims || []).length,
    claimsToday: cToday(claims),
    claimsWeek: cWeek(claims),
    claimsSubmitted: (claims || []).filter(c => c.status && c.status !== "draft").length,
    accountsWithClaim,
    activated,
    preapprovals: (preapprovals || []).length,
    preapprovalsWeek: cWeek(preapprovals),
    devices: (devices || []).length,
    documents: (documents || []).length,
    syllabi: (syllabi || []).length,
  };
  const Stat = ({ label, value, sub }) => (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "#fbfbfc" }}>
      <div className="sans" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".02em" }}>{label}</div>
      <div className="sans" style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginTop: 2 }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="muted sans" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <Shell>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Usage</h2>
          <span className="muted sans" style={{ fontSize: 13 }}>live snapshot</span>
          <span className="spacer" style={{ flex: 1 }} />
          <StatsExport stats={stats} accounts={users} />
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          <Stat label="Accounts" value={stats.accounts} sub={`${stats.newToday} new today · ${stats.newWeek} this week`} />
          <Stat label="Active today" value={stats.activeToday} sub={`${stats.activeWeek} signed in this week`} />
          <Stat label="Students" value={stats.students} />
          <Stat label="Claims total" value={stats.claims} sub={`${stats.claimsToday} today · ${stats.claimsWeek} this week`} />
          <Stat label="Claims submitted" value={stats.claimsSubmitted} sub={`${stats.claims - stats.claimsSubmitted} still draft`} />
          <Stat label="Accounts w/ a claim" value={stats.accountsWithClaim} sub={`${stats.activated}% of parents activated`} />
          <Stat label="Pre-approvals" value={stats.preapprovals} sub={`${stats.preapprovalsWeek} this week`} />
          <Stat label="AR free-Family" value={stats.arFree} />
          <Stat label="Providers" value={stats.providers} />
          <Stat label="Devices saved" value={stats.devices} />
          <Stat label="Documents" value={stats.documents} />
          <Stat label="Syllabi" value={stats.syllabi} />
        </div>
        <p className="muted sans" style={{ fontSize: 12, marginTop: 10 }}>"Today" and "this week" are UTC. "Activated" = parent accounts that have built at least one claim.</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Accounts</h2>
          <span className="muted sans" style={{ fontSize: 13 }}>{users.length} total</span>
        </div>
        <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
          "Reset data" clears a family's students, claims, pre-approvals, syllabi, documents, and files but keeps their
          login so they can start fresh. "Delete account" removes everything, login included. Both ask you to type the
          email first. Only you can see this page.
        </p>
        {listErr && <p className="sans" style={{ fontSize: 13, color: "var(--red)" }}>Could not load accounts: {listErr.message}</p>}
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {users.length === 0
            ? <p className="muted sans" style={{ fontSize: 14 }}>No accounts yet.</p>
            : users.map(u => <AdminRow key={u.id} u={u} />)}
        </div>
      </div>

      <div className="card">
        <h2>Access codes</h2>
        <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
          Create a code to give free access. Share it, and users redeem it on the Upgrade page — no card needed.
        </p>
        <AdminCodes codes={codes || []} />
      </div>
    </Shell>
  );
}

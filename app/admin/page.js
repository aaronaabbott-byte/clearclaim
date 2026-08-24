import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import AdminRow from "./admin-rows";
import AdminCodes from "./admin-codes";

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
    { data: ents }, { data: codes }] = await Promise.all([
    admin.from("kids").select("user_id"),
    admin.from("claims").select("user_id"),
    admin.from("preapprovals").select("user_id"),
    admin.from("profiles").select("user_id,is_parent,is_provider"),
    admin.from("classes").select("user_id"),
    admin.from("invoices").select("user_id,total"),
    admin.from("syllabi").select("user_id,branded"),
    admin.from("provider_items").select("user_id"),
    admin.from("entitlements").select("*"),
    admin.from("access_codes").select("*").order("created_at", { ascending: false }),
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
    }))
    .sort((a, b) => (b.last_sign_in_at || b.created_at || "").localeCompare(a.last_sign_in_at || a.created_at || ""));

  return (
    <Shell>
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

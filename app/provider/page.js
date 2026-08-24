import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, providerReady } from "@/lib/profile";
import { Bar } from "@/app/dashboard/students";

export const dynamic = "force-dynamic";

export default async function ProviderHome() {
  const { user, profile, plan } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");
  if (!plan.provider) redirect("/upgrade");

  const supabase = createClient();
  const { data: docs } = await supabase.from("syllabi").select("id,title,subject,term,created_at")
    .eq("branded", true).order("created_at", { ascending: false });
  const { data: classes } = await supabase.from("classes").select("id,name,service,term,students")
    .order("created_at", { ascending: false });
  const { data: invoices } = await supabase.from("invoices").select("id,invoice_no,student_name,total,invoice_date")
    .order("created_at", { ascending: false });

  let logoUrl = null;
  if (profile.logo_path) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(profile.logo_path, 3600);
    logoUrl = data?.signedUrl || null;
  }
  const ready = providerReady(profile);

  return (
    <>
      <Bar email={user.email} parentView={!!profile.is_parent} />
      <main>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 48, maxWidth: 150, objectFit: "contain", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 4 }} />}
            <div style={{ flex: 1, minWidth: 180 }}>
              <h2 style={{ margin: 0 }}>{profile.business_name || "Your business"}</h2>
              <div className="muted sans" style={{ fontSize: 13 }}>
                {[profile.provider_name, profile.credentials].filter(Boolean).join(", ") || "Provider / vendor"}
                {profile.services ? ` · ${profile.services.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 3).join(", ")}` : ""}
              </div>
            </div>
            <Link href="/provider/setup"><button>Edit business profile</button></Link>
          </div>
          {!ready &&
            <p className="finenote" style={{ marginTop: 12 }}>
              Finish your <Link href="/provider/setup" style={{ color: "var(--navy2)" }}>business profile</Link> so your documents have a proper letterhead.
            </p>}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Classes</h2>
            <span className="spacer" style={{ flex: 1 }} />
            <Link href="/provider/class/new"><button className="primary">+ New class</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
            Set up your classes and keep a roster of the students in each, with a family contact for invoicing.
          </p>
          {(!classes || classes.length === 0)
            ? <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>No classes yet. Create your first above.</p>
            : (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {classes.map(c => {
                  const n = Array.isArray(c.students) ? c.students.length : 0;
                  return (
                    <Link key={c.id} href={`/provider/class/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="kid" style={{ alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <b>{c.name || "Class"}</b>
                          <div className="muted sans" style={{ fontSize: 13 }}>
                            {[c.service, c.term].filter(Boolean).join(" · ")}{(c.service || c.term) ? " · " : ""}{n} student{n === 1 ? "" : "s"}
                          </div>
                        </div>
                        <span className="sans" style={{ fontSize: 12.5, color: "var(--navy2)" }}>Open →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Invoices</h2>
            <span className="spacer" style={{ flex: 1 }} />
            <Link href="/provider/items"><button>Products & services</button></Link>
            <Link href="/provider/invoice/new"><button className="primary">+ New invoice</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
            Make a clean invoice on your own letterhead in seconds. Save the things you charge for once, then tap to add them.
            For direct pay, a payment request is usually easier — invoices are for when you can't link the vendor.
          </p>
          {(!invoices || invoices.length === 0)
            ? <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>No invoices yet. Create your first above.</p>
            : (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {invoices.map(v => (
                  <Link key={v.id} href={`/provider/invoice/${v.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="kid" style={{ alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <b>{v.invoice_no ? `#${v.invoice_no}` : "Invoice"}{v.student_name ? ` · ${v.student_name}` : ""}</b>
                        <div className="muted sans" style={{ fontSize: 13 }}>{v.invoice_date || ""}</div>
                      </div>
                      <span className="sans" style={{ fontSize: 14, fontWeight: 700, color: "var(--navy2)" }}>${Number(v.total || 0).toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Course documents</h2>
            <span className="spacer" style={{ flex: 1 }} />
            <Link href="/provider/document/new"><button className="primary">+ New document</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
            Build a course document — description, objectives, materials, schedule, assessment — with an AI draft and
            export a clean PDF on your letterhead. Great to hand families for their reimbursement records.
          </p>
          {(!docs || docs.length === 0)
            ? <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>No documents yet. Create your first above.</p>
            : (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {docs.map(d => (
                  <Link key={d.id} href={`/provider/document/${d.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="kid" style={{ alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <b>{d.title || d.subject || "Course"}</b>
                        <div className="muted sans" style={{ fontSize: 13 }}>{[d.subject, d.term].filter(Boolean).join(" · ")}</div>
                      </div>
                      <span className="sans" style={{ fontSize: 12.5, color: "var(--navy2)" }}>Open →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      </main>
    </>
  );
}

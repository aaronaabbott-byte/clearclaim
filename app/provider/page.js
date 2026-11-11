import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, providerReady } from "@/lib/profile";
import { Bar } from "@/app/dashboard/students";
import InvoiceStatus from "./invoice-status";

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
  const { data: invoices } = await supabase.from("invoices").select("id,invoice_no,student_name,total,invoice_date,status")
    .order("created_at", { ascending: false });

  // Light at-a-glance summary.
  const invList = invoices || [];
  const totalInvoiced = invList.reduce((s, v) => s + Number(v.total || 0), 0);
  const unpaidTotal = invList.filter(v => v.status !== "paid").reduce((s, v) => s + Number(v.total || 0), 0);
  const studentsServed = new Set([
    ...invList.map(v => (v.student_name || "").trim().toLowerCase()).filter(Boolean),
    ...(classes || []).flatMap(c => (Array.isArray(c.students) ? c.students : []).map(s => (s.student_name || "").trim().toLowerCase()).filter(Boolean)),
  ]).size;
  const classCount = (classes || []).length;
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

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
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {[
              { label: "Invoiced", value: money(totalInvoiced), sub: unpaidTotal > 0 ? `${money(unpaidTotal)} unpaid` : "all paid" },
              { label: "Students served", value: String(studentsServed) },
              { label: "Classes", value: String(classCount) },
            ].map((t, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "10px 12px", background: "#faf8f3" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--navy)" }}>{t.value}</div>
                <div className="muted sans" style={{ fontSize: 12 }}>{t.label}{t.sub ? ` · ${t.sub}` : ""}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidance: what families need from the provider to get reimbursed. */}
        <div className="card">
          <h2 style={{ margin: 0 }}>What your families need from you</h2>
          <p className="muted sans" style={{ fontSize: 13.5, marginTop: 8 }}>
            Families reimburse through their EFA/ESA program, and reviewers look for specific documentation. The tools below produce exactly what they need:
          </p>
          <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.6, color: "#45506a", margin: "4px 0 0", paddingLeft: 18 }}>
            <li><b>An itemized invoice</b> on your letterhead — the student's name, the service dates, each line item with its price, and a total. This is what a family files for a Direct Pay or reimbursement.</li>
            <li><b>A course document</b> for any class — a description, learning objectives, materials, schedule, and how you assess progress. This is what turns a class into an approvable <b>co-curricular course</b> (vs. a plain extracurricular activity) and is the strongest proof of educational use.</li>
            <li><b>Your business details</b> — name, credentials, and contact on every document, so a reviewer can see who provided the service.</li>
          </ul>
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
                    <div className="kid" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <b>{v.invoice_no ? `#${v.invoice_no}` : "Invoice"}{v.student_name ? ` · ${v.student_name}` : ""}</b>
                        <div className="muted sans" style={{ fontSize: 13 }}>{v.invoice_date || ""}</div>
                      </div>
                      <InvoiceStatus id={v.id} status={v.status} />
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

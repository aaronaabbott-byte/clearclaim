import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, providerReady } from "@/lib/profile";
import { Bar } from "@/app/dashboard/students";

export const dynamic = "force-dynamic";

export default async function ProviderHome() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");

  const supabase = createClient();
  const { data: docs } = await supabase.from("syllabi").select("id,title,subject,term,created_at")
    .eq("branded", true).order("created_at", { ascending: false });

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
                {profile.service_name ? ` · ${profile.service_name}` : ""}
              </div>
            </div>
            <Link href="/dashboard/settings"><button>Edit business profile</button></Link>
          </div>
          {!ready &&
            <p className="finenote" style={{ marginTop: 12 }}>
              Finish your <Link href="/provider/setup" style={{ color: "var(--navy2)" }}>business profile</Link> so your documents have a proper letterhead.
            </p>}
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

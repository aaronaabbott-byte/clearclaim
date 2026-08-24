import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS, categoryCap, efaBudgetYear, inBudgetYear, annualCaps } from "@/lib/rules";
import { isAdmin } from "@/lib/admin";
import { getProfile } from "@/lib/profile";
import { schoolYearLabel } from "@/lib/compliance";
import ComplianceTracker from "./compliance";
import CocurricularGuide from "./cocurricular";
import { Bar, KidForm } from "./students";
import ClaimOutcome from "./claim-outcome";
import PreapprovalStatus from "./preapproval-status";
import UpgradeBanner from "./upgrade-banner";

export default async function Dashboard() {
  const supabase = createClient();
  const { user, profile, plan } = await getProfile();
  const isFree = !plan?.family && !plan?.provider;
  if (!user) redirect("/login");
  // Provider-only accounts land in the provider view.
  if (profile?.is_provider && !profile?.is_parent) redirect("/provider");
  const isProvider = !!profile?.is_provider;
  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const hasKids = kids && kids.length > 0;
  const { data: claims } = await supabase.from("claims").select("*").order("created_at", { ascending: false });
  const { data: allSyllabi } = await supabase.from("syllabi").select("id,kid_id,title,subject,term,branded").order("created_at", { ascending: false });
  const syllabi = (allSyllabi || []).filter(s => !s.branded);
  const { data: preapprovals } = await supabase.from("preapprovals").select("*").order("created_at", { ascending: false });
  const hasHomeschool = (kids || []).some(k => k.setting === "homeschool");
  let complianceDone = {};
  if (hasHomeschool) {
    const { data: comp } = await supabase.from("compliance").select("item_key,done").eq("school_year", schoolYearLabel());
    for (const r of comp || []) complianceDone[r.item_key] = r.done;
  }
  const kidName = (id) => (kids || []).find(k => k.id === id)?.first_name || "—";
  const money = (n) => (n || n === 0) ? `$${Number(n).toFixed(2)}` : "—";
  const settingLabel = (v) => (SETTINGS.find(s => s.value === v) || {}).label || v;
  const STATUS = { ready: ["Ready", "var(--teal)"], draft: ["Draft", "var(--gold)"], submitted: ["Submitted", "var(--navy2)"] };
  const BY = efaBudgetYear();
  const CAP_META = [
    { key: "technology", label: "Technology" },
    { key: "extracurricular", label: "Extracurricular / PE / field trips" },
    { key: "travel", label: "Travel / mileage" },
  ];
  const usedBy = (kidId, capKey) => (claims || [])
    .filter(c => c.kid_id === kidId && (categoryCap(c.category) || {}).key === capKey && inBudgetYear(c, BY))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // Onboarding gate: no students yet -> focused first-run screen.
  if (!hasKids) {
    return (
      <>
        <Bar email={user.email} settings={false} admin={isAdmin(user.email)} providerView={isProvider} />
        <main>
          <div className="card" style={{ textAlign: "center", padding: "34px 26px" }}>
            <img src="/wordmark.png" alt="ClearClaim" style={{ width: "min(280px,70%)", margin: "0 auto 6px" }} />
            <h2 style={{ marginTop: 6 }}>Let's set up your first student</h2>
            <p className="muted sans" style={{ fontSize: 14, maxWidth: 480, margin: "0 auto 18px" }}>
              Add each child once. We only ask for what's needed to build and justify a claim —
              nothing sensitive, no account or bank numbers. You can edit or add more anytime in Settings.
            </p>
            <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}><KidForm first /></div>
            <p className="finenote" style={{ maxWidth: 560, margin: "18px auto 0" }}>
              One quick note: ClearClaim is an independent helper, not part of ClassWallet, the Arkansas
              Department of Education, or any EFA or ESA program. We help you prepare strong submissions,
              but approval is always the program administrator's decision and reimbursement is not
              guaranteed. Our guidance comes from public program documents that can change, so please
              verify current rules. What you enter stays private to your account and is never sold or
              shared. <Link href="/terms" style={{ color: "var(--navy2)" }}>Read the full terms</Link>.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Bar email={user.email} admin={isAdmin(user.email)} providerView={isProvider} />
      <main>
        {isFree && <UpgradeBanner />}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Students</h2>
            <span className="spacer" />
            <Link href="/dashboard/settings"><button>Manage students</button></Link>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {kids.map(k => (
              <div className="kid" key={k.id} style={{ alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <b>{k.first_name}</b>{k.grade ? ` · grade ${k.grade}` : ""}
                  <div className="muted sans" style={{ fontSize: 13 }}>
                    {settingLabel(k.setting)}{k.school_name ? ` · ${k.school_name}` : ""}
                    {` · ${k.funding_tier === "succeed" ? "Succeed" : "Standard"} funding`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderColor: "var(--navy2)", background: "linear-gradient(180deg,#f2f6fb,#fff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Check eligibility first</h2>
            <span className="spacer" />
            <Link href="/dashboard/eligibility"><button className="primary">Check an item</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 10 }}>
            Before you buy or build a claim, find out if an item is core or non-core. Starting around December,
            non-core purchases are expected to need Department pre-approval before you buy, so checking first can
            save you from paying out of pocket for something that will not be reimbursed.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Pre-approvals</h2>
            <span className="spacer" />
            <Link href="/dashboard/preapproval/new"><button className="primary">+ New request</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
            Non-core purchases need the Department's approval before you buy, through its Google Form. We fill the form for you and
            keep a log here, since the Department provides no tracking. Status is what you enter yourself.
          </p>
          {(preapprovals && preapprovals.length > 0) && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {preapprovals.map(p => (
                <div className="kid" key={p.id} style={{ alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <Link href={`/dashboard/preapproval/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <b>{p.description || "Request"}</b>{p.cost ? ` · $${p.cost}` : ""}
                    </Link>
                    <div className="muted sans" style={{ fontSize: 13 }}>{p.students || "—"}{p.submitted_date ? ` · sent ${p.submitted_date}` : ""}</div>
                  </div>
                  <PreapprovalStatus req={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Receipt vault</h2>
            <span className="spacer" />
            <Link href="/dashboard/receipts"><button className="primary">Open receipts</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 10 }}>
            File receipts by student as you get them and track what's been claimed. Everything stays sorted, so building
            a claim is just picking from your shoebox instead of hunting for receipts.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Claims</h2>
            <span className="spacer" />
            <Link href="/dashboard/claims/new"><button className="primary">+ Start a claim</button></Link>
          </div>
          {(!claims || claims.length === 0) ? (
            <p className="muted sans" style={{ fontSize: 14, marginTop: 10 }}>
              No claims yet. Start one to attach the receipt and bank charge, auto-draft the reasoning,
              run the rules check, and download a single PDF packet ready to submit.
            </p>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {claims.map(c => {
                const [label, color] = STATUS[c.status] || STATUS.draft;
                return (
                  <div className="kid" key={c.id} style={{ alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <b>{c.vendor || "Claim"}</b> · {money(c.amount)}
                      <div className="muted sans" style={{ fontSize: 13 }}>
                        {kidName(c.kid_id)}{c.date ? ` · ${c.date}` : ""}{c.category ? ` · ${c.category}` : ""}
                      </div>
                    </div>
                    <span className="sans" style={{ fontSize: 12.5, fontWeight: 700, color }}>{label}</span>
                    <ClaimOutcome claim={c} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Syllabi</h2>
            <span className="spacer" />
            <Link href="/dashboard/syllabus/new"><button className="primary">+ Build a syllabus</button></Link>
          </div>
          {(!syllabi || syllabi.length === 0) ? (
            <p className="muted sans" style={{ fontSize: 14, marginTop: 10 }}>
              A course syllabus is the strongest proof of educational use. Build one per course —
              objectives, standards, materials, schedule, and assessment — with an AI draft and a clean PDF.
            </p>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {syllabi.map(s => (
                <Link key={s.id} href={`/dashboard/syllabus/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="kid" style={{ alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <b>{s.title || s.subject || "Course"}</b>
                      <div className="muted sans" style={{ fontSize: 13 }}>
                        {s.kid_id ? kidName(s.kid_id) : "Reusable template"}{s.subject ? ` · ${s.subject}` : ""}{s.term ? ` · ${s.term}` : ""}
                      </div>
                    </div>
                    <span className="sans" style={{ fontSize: 12.5, color: "var(--navy2)" }}>Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Documents & tools</h2>
            <span className="spacer" />
            <Link href="/dashboard/documents"><button>Document library</button></Link>
            <Link href="/dashboard/annotate"><button>Annotate an image</button></Link>
            <Link href="/dashboard/redact"><button>Redact a statement</button></Link>
            <Link href="/dashboard/submit-steps"><button>How to submit on ClassWallet</button></Link>
          </div>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 10 }}>
            Upload booklists and supply lists, annotate a receipt or booklist, or black out the parts of a
            bank statement a reviewer doesn't need before it goes in your packet. Everything stays private to your account.
          </p>
        </div>

        <CocurricularGuide />

        {hasHomeschool && <ComplianceTracker userId={user.id} initialDone={complianceDone} />}

        <div className="card">
          <h2>Budget this year <span className="muted sans" style={{ fontSize: 13, fontWeight: 400 }}>· {BY.label}</span></h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
            Capped categories, per student. Amounts add up across all claims dated Jul–Jun.
          </p>
          {kids.map(k => {
            const caps = annualCaps(k.funding_tier);
            return (
            <div key={k.id} style={{ marginBottom: 14 }}>
              <div className="sans" style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                {k.first_name}
                <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · {k.funding_tier === "succeed" ? "Succeed" : "Standard"} funding</span>
              </div>
              {CAP_META.map(cm => {
                const cap = { ...cm, amount: caps[cm.key] };
                const u = usedBy(k.id, cap.key);
                const pct = Math.min(100, (u / cap.amount) * 100);
                const over = u > cap.amount;
                return (
                  <div key={cap.key} style={{ marginBottom: 8 }}>
                    <div className="sans" style={{ display: "flex", fontSize: 12.5, marginBottom: 3 }}>
                      <span className="muted">{cap.label}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontWeight: 700, color: over ? "var(--red)" : "var(--muted)" }}>
                        {money(u)} / {money(cap.amount)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: over ? "var(--red)" : "var(--navy2)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );})}
        </div>
      </main>
    </>
  );
}

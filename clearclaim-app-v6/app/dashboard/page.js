import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS, FUNDING_TIERS, categoryCap, efaBudgetYear, inBudgetYear, annualCaps } from "@/lib/rules";
import CocurricularGuide from "./cocurricular";

async function addKid(formData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return; // name is required
  await supabase.from("kids").insert({
    user_id: user.id,
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
  });
  revalidatePath("/dashboard");
}

async function updateKid(formData) {
  "use server";
  const supabase = createClient();
  const setting = formData.get("setting");
  const name = (formData.get("first_name") || "").trim();
  if (!name) return;
  await supabase.from("kids").update({
    first_name: name,
    grade: formData.get("grade") || null,
    setting,
    school_name: setting === "homeschool" ? null : (formData.get("school_name") || null),
    subjects: formData.get("subjects") || null,
    funding_tier: formData.get("funding_tier") || "standard",
  }).eq("id", formData.get("id"));
  revalidatePath("/dashboard");
}

async function deleteKid(formData) {
  "use server";
  const supabase = createClient();
  await supabase.from("kids").delete().eq("id", formData.get("id"));
  revalidatePath("/dashboard");
}

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function SettingSelect({ value }) {
  return (
    <select name="setting" defaultValue={value || "homeschool"}>
      {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}
function TierToggle({ value }) {
  return (
    <label className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 400, color: "var(--ink)", fontSize: 14, marginTop: 7, cursor: "pointer" }}>
      <input type="checkbox" name="funding_tier" value="succeed" defaultChecked={value === "succeed"} style={{ width: 18, height: 18 }} />
      Succeed student — higher funding, raises the 25% caps
    </label>
  );
}

// Add-a-student form (blank).
function KidForm({ first = true }) {
  return (
    <form action={addKid}>
      <div className="row">
        <div><label>First name<span style={{ color: "#b3261e" }}> *</span></label>
          <input name="first_name" required placeholder="e.g. Alex" /></div>
        <div><label>Grade</label><input name="grade" placeholder="e.g. 5" /></div>
        <div><label>Setting</label><SettingSelect /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>School name (skip if homeschool)</label><input name="school_name" /></div>
        <div><label>Subjects / courses (optional)</label><input name="subjects" placeholder="Math, Latin, Science" /></div>
      </div>
      <TierToggle />
      <button className="primary" style={{ marginTop: 14 }}>{first ? "Add your first student" : "Add student"}</button>
    </form>
  );
}

// Inline editable student card.
function KidEdit({ k }) {
  return (
    <div className="kid" style={{ display: "block", padding: "16px 18px" }}>
      <form action={updateKid}>
        <input type="hidden" name="id" value={k.id} />
        <div className="row">
          <div><label>First name<span style={{ color: "#b3261e" }}> *</span></label>
            <input name="first_name" required defaultValue={k.first_name} /></div>
          <div><label>Grade</label><input name="grade" defaultValue={k.grade || ""} /></div>
          <div><label>Setting</label><SettingSelect value={k.setting} /></div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>School name (skip if homeschool)</label><input name="school_name" defaultValue={k.school_name || ""} /></div>
          <div><label>Subjects / courses</label><input name="subjects" defaultValue={k.subjects || ""} /></div>
        </div>
        <TierToggle value={k.funding_tier} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="primary">Save changes</button>
        </div>
      </form>
      <form action={deleteKid} style={{ marginTop: 8 }}>
        <input type="hidden" name="id" value={k.id} />
        <button style={{ color: "var(--red)", borderColor: "#e3b7b3" }}>Remove student</button>
      </form>
    </div>
  );
}

function Bar({ email }) {
  return (
    <header>
      <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
      <h1>ClearClaim</h1>
      <span className="spacer" />
      <span className="sans" style={{ color: "#cadaee", fontSize: 14 }}>{email}</span>
      <form action={signOut}><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Sign out</button></form>
    </header>
  );
}

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("*").order("created_at");
  const hasKids = kids && kids.length > 0;
  const { data: claims } = await supabase.from("claims").select("*").order("created_at", { ascending: false });
  const { data: syllabi } = await supabase.from("syllabi").select("id,kid_id,title,subject,term").order("created_at", { ascending: false });
  const kidName = (id) => (kids || []).find(k => k.id === id)?.first_name || "—";
  const money = (n) => (n || n === 0) ? `$${Number(n).toFixed(2)}` : "—";
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
        <Bar email={user.email} />
        <main>
          <div className="card" style={{ textAlign: "center", padding: "34px 26px" }}>
            <img src="/wordmark.png" alt="ClearClaim" style={{ width: "min(280px,70%)", margin: "0 auto 6px" }} />
            <h2 style={{ marginTop: 6 }}>Let's set up your first student</h2>
            <p className="muted sans" style={{ fontSize: 14, maxWidth: 480, margin: "0 auto 18px" }}>
              Add each child once. We only ask for what's needed to build and justify a claim —
              nothing sensitive, no account or bank numbers. You can edit or add more anytime.
            </p>
            <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}><KidForm first /></div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Bar email={user.email} />
      <main>
        <div className="card">
          <h2>Your students</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
            Edit any detail and press Save. These carry into every claim you build.
          </p>
          {kids.map(k => <KidEdit key={k.id} k={k} />)}
        </div>

        <div className="card"><h2>Add another student</h2><KidForm first={false} /></div>

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
                        {kidName(s.kid_id)}{s.subject ? ` · ${s.subject}` : ""}{s.term ? ` · ${s.term}` : ""}
                      </div>
                    </div>
                    <span className="sans" style={{ fontSize: 12.5, color: "var(--navy2)" }}>Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <CocurricularGuide />

        <div className="card">
          <h2>Budget this year <span className="muted sans" style={{ fontSize: 13, fontWeight: 400 }}>· {BY.label}</span></h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
            Capped categories, per student. Amounts add up across all claims dated Aug–Jul.
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
                  <div className="kid" key={c.id} style={{ alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <b>{c.vendor || "Claim"}</b> · {money(c.amount)}
                      <div className="muted sans" style={{ fontSize: 13 }}>
                        {kidName(c.kid_id)}{c.date ? ` · ${c.date}` : ""}{c.category ? ` · ${c.category}` : ""}
                      </div>
                    </div>
                    <span className="sans" style={{ fontSize: 12.5, fontWeight: 700, color }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

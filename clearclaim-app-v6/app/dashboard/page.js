import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS } from "@/lib/rules";
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

        <CocurricularGuide />

        <div className="card">
          <h2>Claims</h2>
          <p className="muted sans" style={{ fontSize: 14 }}>
            Next build step: the claim packager (documents → reasoning → rules check → one-file PDF).
            The pathway model (reimbursement / direct pay) and schema are already in place.
          </p>
        </div>
      </main>
    </>
  );
}

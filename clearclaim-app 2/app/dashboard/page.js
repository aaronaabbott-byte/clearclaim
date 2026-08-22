import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS } from "@/lib/rules";

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

function KidForm({ first = true }) {
  return (
    <form action={addKid}>
      <div className="row">
        <div><label>First name<span style={{color:"#b3261e"}}> *</span></label>
          <input name="first_name" required placeholder="e.g. Alex" /></div>
        <div><label>Grade</label><input name="grade" placeholder="e.g. 5" /></div>
        <div><label>Setting</label>
          <select name="setting" defaultValue="homeschool">
            {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>School name (skip if homeschool)</label><input name="school_name" /></div>
        <div><label>Subjects / courses (optional)</label><input name="subjects" placeholder="Math, Latin, Science" /></div>
      </div>
      <button className="primary" style={{ marginTop: 14 }}>{first ? "Add your first student" : "Add student"}</button>
    </form>
  );
}

function Bar({ email }) {
  return (
    <header>
      <img src="/icon.png" alt="" width="38" height="38" style={{borderRadius:10, background:"#fff", padding:3}} />
      <h1>ClearClaim</h1>
      <span className="spacer" />
      <span className="sans" style={{ color: "#cadaee", fontSize: 14 }}>{email}</span>
      <form action={signOut}><button style={{ background:"#ffffff1a", color:"#fff", borderColor:"#ffffff40" }}>Sign out</button></form>
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
              nothing sensitive, no account or bank numbers.
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
          {kids.map(k => (
            <div className="kid" key={k.id}>
              <div style={{ flex: 1 }}>
                <b>{k.first_name}</b> {k.grade ? `· grade ${k.grade}` : ""}
                <div className="muted sans" style={{ fontSize: 13 }}>
                  {SETTINGS.find(s => s.value === k.setting)?.label}
                  {k.school_name ? ` · ${k.school_name}` : ""}{k.subjects ? ` · ${k.subjects}` : ""}
                </div>
              </div>
              <form action={deleteKid}><input type="hidden" name="id" value={k.id} /><button>Remove</button></form>
            </div>
          ))}
        </div>
        <div className="card"><h2>Add another student</h2><KidForm first={false} /></div>
        <div className="card">
          <h2>Claims</h2>
          <p className="muted sans" style={{ fontSize: 14 }}>
            Next build step: port the claim packager (documents → reasoning → rules check → one-file PDF).
            The pathway model (reimbursement / direct pay) and schema are already in place.
          </p>
        </div>
      </main>
    </>
  );
}

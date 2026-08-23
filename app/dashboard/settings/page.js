import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KidForm, KidEdit } from "../students";

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("*").order("created_at");
  const hasKids = kids && kids.length > 0;

  return (
    <>
      <header>
        <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
        <h1>ClearClaim</h1>
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Students</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
            Add, edit, or remove your students. These details carry into every claim and syllabus.
          </p>
          {hasKids ? kids.map(k => <KidEdit key={k.id} k={k} />)
            : <p className="muted sans" style={{ fontSize: 14 }}>No students yet — add your first below.</p>}
        </div>

        <div className="card">
          <h2>Add a student</h2>
          <KidForm first={!hasKids} />
        </div>
      </main>
    </>
  );
}

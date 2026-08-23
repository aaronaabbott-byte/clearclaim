import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KidForm, KidEdit } from "../students";
import StudentReorder from "../student-reorder";

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const hasKids = kids && kids.length > 0;

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="30" style={{ background: "#fff", borderRadius: 10, padding: "5px 10px", display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Students</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
            Add, edit, remove, or reorder your students. This order is used everywhere, so put them however is
            easiest to track — birth order works well. These details carry into every claim and syllabus.
          </p>
          {hasKids && <StudentReorder kids={kids.map(k => ({ id: k.id, first_name: k.first_name, grade: k.grade }))} />}
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

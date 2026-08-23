"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const blankStudent = () => ({ student_name: "", family_name: "", contact: "" });

// Create / edit a provider class and its roster. Roster rows hold the student
// plus a family/parent name and contact (handy for invoicing later).
export default function ClassEditor({ userId, existing, services = [] }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!existing;

  const [name, setName] = useState(existing?.name || "");
  const [service, setService] = useState(existing?.service || "");
  const [term, setTerm] = useState(existing?.term || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [students, setStudents] = useState(
    Array.isArray(existing?.students) && existing.students.length ? existing.students : [blankStudent()]
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const setStudent = (i, k, v) => setStudents(list => list.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const addStudent = () => setStudents(list => [...list, blankStudent()]);
  const removeStudent = (i) => setStudents(list => list.length > 1 ? list.filter((_, j) => j !== i) : list);

  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!name.trim()) { setErr("Give the class a name."); setBusy(false); return; }
      const cleanStudents = students.filter(s => (s.student_name || "").trim());
      const row = { user_id: userId, name: name.trim(), service, term, notes, students: cleanStudents };
      let error;
      if (editing) ({ error } = await supabase.from("classes").update(row).eq("id", existing.id));
      else ({ error } = await supabase.from("classes").insert(row));
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setMsg("Saved.");
      router.refresh();
      setTimeout(() => router.push("/provider"), 700);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase.from("classes").delete().eq("id", existing.id);
    setBusy(false);
    if (error) { setErr("Could not delete: " + error.message); return; }
    router.push("/provider"); router.refresh();
  }

  return (
    <div className="card">
      <h2>{editing ? "Edit class" : "New class"}</h2>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Class name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tuesday Reading Group" /></div>
        <div>
          <label>Service</label>
          <input list="svc-list" value={service} onChange={e => setService(e.target.value)} placeholder="Pick or type a service" />
          <datalist id="svc-list">{services.map((s, i) => <option key={i} value={s} />)}</datalist>
        </div>
        <div><label>Term</label><input value={term} onChange={e => setTerm(e.target.value)} placeholder="e.g. 2026-27" /></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ margin: 0 }}>Roster</label>
          <span className="spacer" style={{ flex: 1 }} />
          <button type="button" className="sans" style={{ fontSize: 13 }} onClick={addStudent}>+ Add student</button>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {students.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <input value={s.student_name} onChange={e => setStudent(i, "student_name", e.target.value)} placeholder="Student name" />
              <input value={s.family_name} onChange={e => setStudent(i, "family_name", e.target.value)} placeholder="Family / parent" />
              <input value={s.contact} onChange={e => setStudent(i, "contact", e.target.value)} placeholder="Contact (email or phone)" />
              <button type="button" className="sans" style={{ fontSize: 12, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => removeStudent(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Notes (optional)</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything you want to remember about this class." />
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button className="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : editing ? "Save class" : "Create class"}</button>
        {editing && <button type="button" disabled={busy} onClick={remove} style={{ color: "var(--red)", borderColor: "#e3b7b3" }}>Delete class</button>}
        <button type="button" onClick={() => router.push("/provider")} style={{ marginLeft: "auto" }}>Cancel</button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { efaBudgetYear } from "@/lib/rules";
import { buildSyllabusPdf } from "@/lib/syllabus";

export default function SyllabusBuilder({ kids = [], userId, existing, provider = null, providerMode = false }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!existing;

  const [kidId, setKidId] = useState(providerMode ? "" : (existing?.kid_id || kids[0]?.id || ""));
  const [f, setF] = useState({
    title: existing?.title || "",
    subject: existing?.subject || "",
    grade: existing?.grade || (kids[0]?.grade || ""),
    term: existing?.term || efaBudgetYear().label,
    level: existing?.level || "",
    weeks: existing?.weeks || "",
    sessions_per_week: existing?.sessions_per_week || "",
    instructor: existing?.instructor || "",
    description: existing?.description || "",
    objectives: existing?.objectives || "",
    methods: existing?.methods || "",
    standards: existing?.standards || "",
    materials: existing?.materials || "",
    schedule: existing?.schedule || "",
    assessment: existing?.assessment || "",
    resources: existing?.resources || "",
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const kid = kids.find(k => k.id === kidId);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  async function draftWithAI() {
    setErr(""); setMsg(""); setAiBusy(true);
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: { title: f.title, subject: f.subject, grade: f.grade, term: f.term, materials: f.materials,
            level: f.level, weeks: f.weeks, sessions_per_week: f.sessions_per_week, notes },
          kid: kid || {},
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setF(prev => ({ ...prev, ...data.draft }));
        setMsg(data.source === "ai" ? "Drafted with AI — edit anything before saving."
          : "AI isn't set up yet — filled a solid template you can edit.");
      } else setErr("Couldn't draft the syllabus. Try again.");
    } catch (e) { setErr("Couldn't reach the drafting service."); }
    setAiBusy(false);
  }

  async function providerForPdf() {
    if (!providerMode || !provider) return null;
    let logoDataUrl = null;
    if (provider.logo_path) {
      try {
        const { data } = await supabase.storage.from("documents").download(provider.logo_path);
        if (data) logoDataUrl = await new Promise((res) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(data);
        });
      } catch { /* skip logo on failure */ }
    }
    return { ...provider, logoDataUrl };
  }

  async function downloadPdf() {
    const doc = await buildSyllabusPdf({ ...f }, kid, await providerForPdf());
    doc.save(`${providerMode ? "Course" : "Syllabus"}-${(f.title || f.subject || "course").replace(/\W+/g, "-")}.pdf`);
  }

  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!f.title && !f.subject) { setErr("Give the course a title or subject."); setBusy(false); return; }
      const row = { user_id: userId, kid_id: providerMode ? null : (kidId || null), status: "final", branded: providerMode, ...f };
      let error;
      if (editing) ({ error } = await supabase.from("syllabi").update(row).eq("id", existing.id));
      else ({ error } = await supabase.from("syllabi").insert(row));
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setMsg("Saved.");
      router.refresh();
      setTimeout(() => router.push(providerMode ? "/provider" : "/dashboard"), 900);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  // Save a copy — great for reusing a syllabus for another child or year.
  async function duplicate() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const row = { user_id: userId, kid_id: kidId || null, status: "draft", ...f,
        title: (f.title || f.subject || "Course") + " (copy)" };
      const { data, error } = await supabase.from("syllabi").insert(row).select("id").single();
      if (error) { setErr("Could not duplicate: " + error.message); setBusy(false); return; }
      router.push(`${providerMode ? "/provider/document" : "/dashboard/syllabus"}/${data.id}`);
      router.refresh();
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  if (!kids.length && !providerMode) {
    return <div className="card"><p className="sans">Add a student first, then build a syllabus.</p></div>;
  }

  const Area = ({ label, k, rows = 4, ph }) => (
    <div style={{ marginTop: 12 }}>
      <label>{label}</label>
      <textarea rows={rows} value={f[k]} onChange={e => set(k, e.target.value)} placeholder={ph} />
    </div>
  );

  return (
    <div className="card">
      <h2>{editing ? (providerMode ? "Edit course document" : "Edit syllabus") : (providerMode ? "New course document" : "Build a syllabus")}</h2>
      <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
        {providerMode
          ? "Create a branded course document. Fill the basics, let AI draft the rest, edit freely, then download a PDF with your letterhead."
          : "A course syllabus is the strongest proof of educational use. Fill the basics, let AI draft the rest, edit freely, then save and download a clean PDF to submit."}
      </p>

      <div className="row" style={{ marginTop: 10 }}>
        {!providerMode && (
          <div><label>Student</label>
            <select value={kidId} onChange={e => setKidId(e.target.value)}>
              <option value="">Unassigned — reusable template</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}{k.grade ? ` (grade ${k.grade})` : ""}</option>)}
            </select>
          </div>
        )}
        <div><label>Course title</label><input value={f.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 5th-Grade Latin" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Subject</label><input value={f.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. World Languages" /></div>
        <div><label>Grade</label><input value={f.grade} onChange={e => set("grade", e.target.value)} placeholder="e.g. 5" /></div>
        <div><label>Term / year</label><input value={f.term} onChange={e => set("term", e.target.value)} /></div>
        <div><label>Instructor</label><input value={f.instructor} onChange={e => set("instructor", e.target.value)} placeholder="e.g. Parent / co-op teacher" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Level</label>
          <select value={f.level} onChange={e => set("level", e.target.value)}>
            <option value="">—</option>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
        <div><label>Weeks</label><input value={f.weeks} onChange={e => set("weeks", e.target.value)} placeholder="e.g. 18" inputMode="numeric" /></div>
        <div><label>Sessions / week</label><input value={f.sessions_per_week} onChange={e => set("sessions_per_week", e.target.value)} placeholder="e.g. 3" inputMode="numeric" /></div>
      </div>

      <div style={{ marginTop: 14, border: "1px dashed var(--line)", borderRadius: 12, padding: "12px 14px", background: "#f7f9fc" }}>
        <label>Curriculum / materials you're using (helps the AI draft)</label>
        <input value={f.materials} onChange={e => set("materials", e.target.value)} placeholder="e.g. Latin for Children Primer A, workbook, flashcards" />
        <label style={{ marginTop: 8 }}>Anything else to weave in (optional)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. meets twice a week; co-op class on Tuesdays" />
        <button type="button" className="primary" onClick={draftWithAI} disabled={aiBusy} style={{ marginTop: 12 }}>
          {aiBusy ? "Drafting…" : "✨ Draft the syllabus"}
        </button>
      </div>

      <Area label="Course of study" k="description" rows={3} ph="What the course covers and how it's taught." />
      <Area label="Learning objectives" k="objectives" rows={5} ph="Measurable things the student will know or be able to do." />
      <Area label="Teaching methods & lesson plans" k="methods" rows={4} ph="How lessons are taught — teaching approach, lesson structure, activities and exercises. (Required for Arizona curriculum documentation.)" />
      <Area label="Standards & skills alignment" k="standards" rows={3} ph="Standards or subject-area skills the course lines up with." />
      <Area label="Required materials" k="materials" rows={3} ph="Texts, workbooks, and resources required to meet the objectives." />
      <Area label="Scope & sequence (schedule)" k="schedule" rows={6} ph="Week-by-week or unit plan." />
      <Area label="Assessment & grading" k="assessment" rows={4} ph="How progress is measured and graded." />
      <Area label="Resources & materials (videos, tutorials, sites)" k="resources" rows={5} ph="Web resources for the course. The AI draft searches the web and fills these in — review the links and edit or remove any that look off before saving." />

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : editing ? "Save changes" : "Save syllabus"}</button>
        {editing && <button type="button" disabled={busy} onClick={duplicate}>Duplicate</button>}
        <button type="button" onClick={downloadPdf}>Download PDF</button>
        <button type="button" onClick={() => router.push(providerMode ? "/provider" : "/dashboard")} style={{ marginLeft: "auto" }}>Cancel</button>
      </div>
    </div>
  );
}

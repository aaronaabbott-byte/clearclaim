"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CRITERIA, COST_NOTE, buildPrefillUrl } from "@/lib/preapproval";

export default function PreapprovalBuilder({ kids, userEmail, existing }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!existing;

  const [parentName, setParentName] = useState(existing?.parent_name || "");
  const [email, setEmail] = useState(existing?.email || userEmail || "");
  const [students, setStudents] = useState(existing?.students || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [cost, setCost] = useState(existing?.cost || "");
  const [justification, setJustification] = useState(existing?.justification || "");
  const [link, setLink] = useState(existing?.link || "");
  const [covered, setCovered] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function addKid(k) {
    const piece = `${k.first_name}${k.grade ? `, grade ${k.grade}` : ""}`;
    setStudents(s => s ? (s.includes(piece) ? s : `${s}; ${piece}`) : piece);
  }

  async function generate(extraNote) {
    setErr(""); setMsg(""); setAiBusy(true);
    try {
      const res = await fetch("/api/preapproval-justification", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, students, cost, notes: extraNote || "" }),
      });
      const d = await res.json();
      if (d.justification) {
        setJustification(d.justification);
        setCovered(d.covered || []);
        if (!description && d.field5) setDescription(d.field5);
        setMsg(d.source === "ai" ? "Drafted. Review the checklist below, then edit anything."
          : d.source === "no-key" ? "AI isn't set up yet — filled a solid template you can edit." : "Filled a template you can edit.");
      } else setErr("Couldn't draft. Try again.");
    } catch { setErr("Couldn't reach the drafting service."); }
    setAiBusy(false);
  }

  const prefillUrl = buildPrefillUrl({ email, parentName, students, description, cost, justification, link });

  async function saveLog(status) {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!description && !justification) { setErr("Add a description or generate the justification first."); setBusy(false); return; }
      const row = {
        students, description, cost, justification, link, status,
        submitted_date: status === "submitted" ? new Date().toISOString().slice(0, 10) : (existing?.submitted_date || null),
      };
      let error;
      if (editing) ({ error } = await supabase.from("preapprovals").update(row).eq("id", existing.id));
      else ({ error } = await supabase.from("preapprovals").insert({ ...row, user_id: (await supabase.auth.getUser()).data.user.id }));
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setMsg(status === "submitted" ? "Logged as submitted." : "Saved to your log.");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <>
      <div className="card">
        <h2>{editing ? "Edit pre-approval request" : "Pre-approval request"}</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Non-core expenses need the Department's approval before you buy, through its Google Form.
          Fill this in, we open the form already filled out, and you review and submit it. ClearClaim never submits for you.
        </p>

        <div className="row">
          <div><label>Parent / guardian name</label><input value={parentName} onChange={e => setParentName(e.target.value)} /></div>
          <div><label>Your email (the form asks twice)</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Student name(s) and grade — one form covers all students sharing this expense</label>
          <textarea rows={2} value={students} onChange={e => setStudents(e.target.value)} placeholder="e.g. Alex, grade 3; Sam, grade 5" />
          {kids.length > 0 &&
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {kids.map(k => <button key={k.id} type="button" className="sans" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addKid(k)}>+ {k.first_name}{k.grade ? ` (grade ${k.grade})` : ""}</button>)}
            </div>}
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Description (keep it short — the form wants "laptop", not a sentence)</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. laptop" /></div>
          <div><label>Anticipated cost (item price)</label><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="e.g. 499" /></div>
        </div>
        <p className="finenote" style={{ marginTop: 6 }}>{COST_NOTE}</p>

        <div style={{ marginTop: 12 }}>
          <label>Why it is necessary (the long field that carries the request)</label>
          <textarea rows={6} value={justification} onChange={e => setJustification(e.target.value)} placeholder="Explain how this supports the student's learning. Or let AI draft it, then edit." />
          <button type="button" className="primary" onClick={() => generate()} disabled={aiBusy} style={{ marginTop: 8 }}>
            {aiBusy ? "Drafting…" : "✨ Draft the justification"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Optional link (item, curriculum, or course description)</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
        </div>

        {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
      </div>

      {/* Seven-criteria checklist */}
      <div className="card">
        <h2 style={{ margin: 0 }}>Does your explanation cover the full standard?</h2>
        <p className="muted sans" style={{ fontSize: 13.5, marginTop: 6 }}>
          The form only asks for part of what reviewers actually look at. When all seven are covered, you have said enough.
          This is a checklist, not a prediction of approval.
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {CRITERIA.map(c => {
            const on = covered.includes(c.id);
            return (
              <div key={c.id} className="sans" style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "center",
                border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", background: on ? "#f2f8f6" : "#fff" }}>
                <span style={{ color: on ? "var(--teal)" : "var(--muted)", fontWeight: 700 }}>{on ? "✓" : "•"}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{c.name}</b> <span className="muted" style={{ fontSize: 12 }}>· {c.group}</span>
                  <div className="muted" style={{ fontSize: 13 }}>{c.plain}</div>
                </div>
                {!on && justification &&
                  <button type="button" className="sans" style={{ fontSize: 12 }} disabled={aiBusy}
                    onClick={() => generate(`Make sure to clearly address: ${c.name} (${c.plain})`)}>Add this</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Open the form + walkthrough */}
      <div className="card">
        <h2>Open the form, filled in</h2>
        <ol className="sans" style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Open the pre-approval form. Every field is filled from what you entered above.</li>
          <li>Read each field and fix anything.</li>
          <li>Turn on <b>"Send me a copy of my responses"</b> near the bottom. That emailed copy is your only record.</li>
          <li>Click <b>Submit</b> on the form. ClearClaim does not submit it for you.</li>
        </ol>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <a href={prefillUrl} target="_blank" rel="noopener noreferrer"><button className="primary">Open the pre-approval form ↗</button></a>
          <button type="button" disabled={busy} onClick={() => saveLog("draft")}>Save to my log</button>
          <button type="button" disabled={busy} onClick={() => saveLog("submitted")}>I submitted it — log as submitted</button>
        </div>
        <p className="finenote" style={{ marginTop: 12 }}>
          ClearClaim has no connection to the Department and cannot see your request's status. You update the status yourself in your log.
          This is guidance based on published rule text, not a decision. The Department decides, and approval is not guaranteed.
        </p>
      </div>
    </>
  );
}

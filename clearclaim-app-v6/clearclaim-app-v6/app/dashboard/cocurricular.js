"use client";
import { useState } from "react";
import { COCURRICULAR, checkCocurricular } from "@/lib/rules";

export default function CocurricularGuide() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState([]);
  const [className, setClassName] = useState("");
  const [provider, setProvider] = useState("");

  function toggle(id) {
    setChecked(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
  }
  const res = checkCocurricular(checked);
  const pct = Math.round((res.metCount / res.total) * 100);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Co-curricular course check</h2>
        <span className="spacer" />
        <button className="sans" onClick={() => setOpen(o => !o)}>
          {open ? "Hide" : "Open the checklist"}
        </button>
      </div>
      <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>
        {COCURRICULAR.intro}
      </p>

      {open && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <div><label>Class name</label>
              <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. Studio Ballet II" /></div>
            <div><label>Provider</label>
              <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Rockefeller Arts" /></div>
          </div>

          <div style={{ margin: "16px 0 6px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 10, background: "#eef2f7", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%",
                background: res.qualifies ? "var(--teal)" : "var(--gold)", transition: "width .2s" }} />
            </div>
            <span className="sans" style={{ fontSize: 13, fontWeight: 700,
              color: res.qualifies ? "var(--teal)" : "var(--muted)" }}>
              {res.metCount}/{res.total}
            </span>
          </div>

          <div className="sans" style={{
            fontSize: 13.5, padding: "10px 12px", borderRadius: 10, marginBottom: 12,
            background: res.qualifies ? "#e7f4f1" : "#fbf3e2",
            color: res.qualifies ? "#0f5b52" : "#7a5a12" }}>
            {res.qualifies
              ? "All ten met. Gather the documents noted below and submit as a co-curricular course."
              : res.likelyExtracurricular
                ? "Missing \"instructional design\" or \"standards\" — the two rows reviewers weigh most. Without a real syllabus + assessment plan this is likely an extracurricular activity, not co-curricular."
                : `${res.total - res.metCount} requirement(s) left. Check each row once you have the document that proves it.`}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {COCURRICULAR.requirements.map((r, i) => {
              const on = checked.includes(r.id);
              return (
                <label key={r.id} className="sans" style={{
                  display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, alignItems: "start",
                  border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px",
                  background: on ? "#f2f8f6" : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(r.id)} style={{ width: 18, height: 18, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14.5 }}>{i + 1}. {r.requirement}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>Document: {r.doc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <details style={{ marginTop: 14 }}>
            <summary className="sans" style={{ cursor: "pointer", fontSize: 13.5, color: "var(--navy2)" }}>
              What reviewers watch for
            </summary>
            <ul className="muted sans" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>
              {COCURRICULAR.warnings.map((w, i) => <li key={i} style={{ marginBottom: 8 }}>{w}</li>)}
            </ul>
            <p className="muted sans" style={{ fontSize: 11.5, marginTop: 6 }}>{COCURRICULAR.source}</p>
          </details>
        </>
      )}
    </div>
  );
}

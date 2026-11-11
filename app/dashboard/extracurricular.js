"use client";
import { useState } from "react";
import { EXTRACURRICULAR, checkExtracurricular } from "@/lib/rules";
import ActivityJustify from "./activity-justify";

export default function ExtracurricularGuide() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState([]);
  const [activity, setActivity] = useState("");
  const [provider, setProvider] = useState("");

  function toggle(id) {
    setChecked(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
  }
  const res = checkExtracurricular(checked);
  const pct = Math.round((res.metCount / res.total) * 100);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Extracurricular activity check</h2>
        <span className="spacer" />
        <button className="sans" onClick={() => setOpen(o => !o)}>
          {open ? "Hide" : "Open the checklist"}
        </button>
      </div>
      <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>{EXTRACURRICULAR.intro}</p>

      {open && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <div><label>Activity name</label>
              <input value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Youth Soccer League" /></div>
            <div><label>Provider</label>
              <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. City Parks & Rec" /></div>
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
              ? "All six met. Gather the documents noted below and submit as an extracurricular activity."
              : `${res.total - res.metCount} requirement(s) left. Check each row once you have the document that proves it.`}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {EXTRACURRICULAR.requirements.map((r, i) => {
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

          <div className="sans" style={{ fontSize: 12.8, background: "#f5f7fb", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginTop: 12, color: "#45506a" }}>
            <b>What's excluded, and the 25% limit:</b>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>
              {EXTRACURRICULAR.exclusions.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
            <p style={{ margin: "8px 0 0" }}>{EXTRACURRICULAR.capNote}</p>
          </div>

          <ActivityJustify type="extracurricular" name={activity} provider={provider} checkedIds={checked}
            notePlaceholder="e.g. what your student does in it, what it builds, and who leads it" />

          <details style={{ marginTop: 14 }}>
            <summary className="sans" style={{ cursor: "pointer", fontSize: 13.5, color: "var(--navy2)" }}>
              Is it really extracurricular?
            </summary>
            <ul className="muted sans" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>
              {EXTRACURRICULAR.warnings.map((w, i) => <li key={i} style={{ marginBottom: 8 }}>{w}</li>)}
            </ul>
            <p className="muted sans" style={{ fontSize: 11.5, marginTop: 6 }}>{EXTRACURRICULAR.source}</p>
          </details>
        </>
      )}
    </div>
  );
}

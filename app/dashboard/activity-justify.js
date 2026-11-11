"use client";
import { useState } from "react";

// Shared "Write my justification" block used by both the co-curricular and
// extracurricular checklists. Sends the ticked requirements to the server, which
// drafts a justification grounded only in what was checked.
export default function ActivityJustify({ type, name, provider, checkedIds, notePlaceholder }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function write() {
    setBusy(true); setErr(""); setCopied(false);
    try {
      const res = await fetch("/api/activity-justification", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name, provider, checkedIds, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't write the justification.");
      setOut(data);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  function copy(t) { try { navigator.clipboard.writeText(t); setCopied(true); } catch { /* ignore */ } }

  const nothingChecked = !checkedIds || checkedIds.length === 0;

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <label className="sans" style={{ fontSize: 13.5, fontWeight: 600 }}>Write my justification</label>
      <p className="muted sans" style={{ fontSize: 12.5, marginTop: 2, marginBottom: 8 }}>
        Drafts a submission justification from the boxes you've checked. Add a line of detail to make it specific.
      </p>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder={notePlaceholder || "e.g. what your student does in it, what they're learning, who leads it"}
        style={{ width: "100%", fontSize: 13, boxSizing: "border-box" }} />
      <button type="button" className="primary" disabled={busy || nothingChecked} style={{ marginTop: 8 }} onClick={write}>
        {busy ? "Writing…" : "Write my justification"}
      </button>
      {nothingChecked && <span className="muted sans" style={{ fontSize: 12, marginLeft: 10 }}>Check a box or two first.</span>}
      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}

      {out && (
        <div style={{ marginTop: 12 }}>
          <textarea readOnly value={out.justification} rows={8}
            style={{ width: "100%", fontSize: 13.5, boxSizing: "border-box", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => copy(out.justification)}>{copied ? "Copied" : "Copy"}</button>
            {!out.ai && <span className="muted sans" style={{ fontSize: 12 }}>Built from a template (AI assist off).</span>}
          </div>
          {out.docs && out.docs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="sans" style={{ fontSize: 13, fontWeight: 600 }}>Attach these documents:</div>
              <ul className="muted sans" style={{ fontSize: 12.8, lineHeight: 1.5, marginTop: 4 }}>
                {out.docs.map((d, i) => <li key={i} style={{ marginBottom: 4 }}>{d}</li>)}
              </ul>
            </div>
          )}
          {out.missing && out.missing.length > 0 && (
            <p className="sans" style={{ fontSize: 12.5, color: "#7a5a12", background: "#fbf3e2", borderRadius: 8, padding: "8px 10px", marginTop: 6 }}>
              Still unchecked: {out.missing.join("; ")}. Document these before you submit, or this may fit the other category better.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

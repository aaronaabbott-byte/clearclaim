"use client";
import { useState } from "react";
import Link from "next/link";
import { diagnoseDenial, VERDICT_LABEL } from "@/lib/denials";

const STYLE = {
  fixable: { bg: "#eef7f1", bd: "#bfe0cd", fg: "#1f6b45" },
  conditional: { bg: "#fdf7e8", bd: "#e7d3a6", fg: "#8a6d1a" },
  ineligible: { bg: "#fbeeee", bd: "#e3b7b3", fg: "#9a2b25" },
  unclear: { bg: "#eef2f8", bd: "#c3d6ea", fg: "#274b76" },
};

export default function FixDenied({ categories = [], premium = false }) {
  const [reason, setReason] = useState("");
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [res, setRes] = useState(null);
  const [aiNote, setAiNote] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  function diagnose() {
    setAiNote("");
    const r = reason.trim();
    if (!r) { setRes(null); return; }
    setRes(diagnoseDenial(r, { items: item, category }));
  }

  async function aiRead() {
    setAiBusy(true);
    try {
      const resp = await fetch("/api/diagnose", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, items: item, category }),
      });
      const data = await resp.json();
      setAiNote(data.aiNote || (data.premium === false ? "An AI read is a Family-plan feature." : "Couldn't get an AI read right now — try the fixes above, or ask the support line."));
    } catch { setAiNote("Couldn't reach the server. Please try again."); }
    setAiBusy(false);
  }

  const canRebuild = res && (res.verdict === "fixable" || res.verdict === "conditional");
  const rebuildNote = res
    ? "Correcting a denied submission. Fix to make: " + res.matched.map(m => m.title).join("; ")
    : "";
  const rebuildHref = `/dashboard/claims/new?items=${encodeURIComponent(item)}&category=${encodeURIComponent(category)}&note=${encodeURIComponent(rebuildNote)}`;
  const v = res ? (STYLE[res.verdict] || STYLE.unclear) : null;

  return (
    <div className="card">
      <h2 style={{ marginBottom: 4 }}>Fix a denied submission</h2>
      <p className="muted sans" style={{ fontSize: 14, marginTop: 0 }}>
        Paste the reviewer's denial reason and we'll tell you whether it's a fixable mistake — and exactly what to
        change — or whether the item was never going to qualify, so you don't keep resubmitting for nothing.
      </p>

      <div style={{ marginTop: 10 }}>
        <label>What did the denial say? (paste the reviewer's reason)</label>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
          placeholder='e.g. "Resubmit with proof of payment" or "Denied — resubmit with course taking"' />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>What was the item? (optional)</label><input value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. rabbit hutch, laptop, art supplies" /></div>
        <div><label>Category (optional)</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">—</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button className="primary" style={{ marginTop: 12 }} onClick={diagnose} disabled={!reason.trim()}>Diagnose it</button>

      {res && (
        <div style={{ marginTop: 16 }}>
          <div className="sans" style={{ background: v.bg, border: `1px solid ${v.bd}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontWeight: 800, color: v.fg, fontSize: 15 }}>
              {res.verdict === "fixable" ? "✓ " : res.verdict === "ineligible" ? "✕ " : res.verdict === "conditional" ? "! " : "? "}
              {VERDICT_LABEL[res.verdict]}
            </div>
            {res.unclear && (
              <p className="sans" style={{ fontSize: 13.5, marginTop: 6, color: "#3c4048" }}>
                We couldn't match that wording to a known reason. Double-check the exact text from ClassWallet, or get an AI read below.
              </p>
            )}
          </div>

          {res.matched.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {res.matched.map((m, i) => {
                const ms = STYLE[m.level] || STYLE.unclear;
                return (
                  <div key={i} style={{ border: `1px solid ${ms.bd}`, borderRadius: 10, padding: "11px 13px" }}>
                    <div className="sans" style={{ fontWeight: 700, color: ms.fg, fontSize: 13.5 }}>{m.title}</div>
                    <p className="sans" style={{ fontSize: 13.5, marginTop: 4, marginBottom: 0, color: "#3c4048", lineHeight: 1.5 }}>{m.fix}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {canRebuild && (
              <Link href={rebuildHref}><button className="primary">Start a corrected claim</button></Link>
            )}
            {res.unclear && (
              <button type="button" onClick={aiRead} disabled={aiBusy} style={{ borderColor: "var(--navy2)", color: "var(--navy2)" }}>
                {aiBusy ? "Reading…" : "✨ Get an AI read"}
              </button>
            )}
          </div>

          {aiNote && (
            <div className="sans" style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px", background: "#fbfaf7" }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--navy)", marginBottom: 4 }}>AI read</div>
              <p className="sans" style={{ fontSize: 13.5, margin: 0, color: "#3c4048", lineHeight: 1.5 }}>{aiNote}</p>
              <p className="finenote" style={{ marginTop: 6 }}>This is an automated read and can be wrong — confirm anything you're unsure about with your program.</p>
            </div>
          )}

          <p className="finenote" style={{ marginTop: 14 }}>
            This is guidance to help you fix a submission — it isn't a decision and doesn't guarantee approval. The Department makes the final call.
          </p>
        </div>
      )}
    </div>
  );
}

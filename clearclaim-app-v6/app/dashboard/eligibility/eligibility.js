"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const VERDICT = {
  core: ["Core expense", "var(--teal)", "#e7f4f1", "#0f5b52"],
  "non-core": ["Non-core expense", "var(--gold)", "#fbf3e2", "#7a5a12"],
  ambiguous: ["Judgment call", "var(--navy2)", "#eef2f7", "var(--navy)"],
};
const TONE = { ok: ["#e7f4f1", "#0f5b52"], warn: ["#fbf3e2", "#7a5a12"], stop: ["#fbeeee", "#b3261e"] };

export default function Eligibility({ kids, ruleVersion }) {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("planned");
  const [date, setDate] = useState("");
  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  const kid = kids.find(k => k.id === kidId);

  async function check(e) {
    e?.preventDefault();
    if (!desc.trim()) { setErr("Describe what you want to buy or bought."); return; }
    setErr(""); setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: desc, purchaseStatus: status,
          purchaseDate: status === "bought" ? (date || null) : null,
          firstProgramYear: kid?.program_start_year || null,
        }),
      });
      setRes(await r.json());
    } catch { setErr("Couldn't run the check. Please try again."); }
    setBusy(false);
  }

  function continueToClaim() {
    const items = encodeURIComponent(desc.slice(0, 300));
    const note = encodeURIComponent((res?.verdict?.reasoning || "").slice(0, 500));
    router.push(`/dashboard/claims/new?items=${items}&note=${note}`);
  }

  const v = res?.verdict, a = res?.action;
  const vc = v ? VERDICT[v.classification] || VERDICT.ambiguous : null;
  const tc = a ? TONE[a.tone] || TONE.warn : null;

  return (
    <>
      <div className="card">
        <h2>Check eligibility first</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Before you buy or build a claim, check whether an item is core or non-core under {ruleVersion}.
          Starting around December, non-core purchases are expected to need Department pre-approval before you buy.
        </p>
        <form onSubmit={check}>
          <label>What do you want to buy, or what did you already buy?</label>
          <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="e.g. Baketivity subscription kit for my kindergartener" />
          <div className="row" style={{ marginTop: 10 }}>
            <div><label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="planned">Not bought yet</option>
                <option value="bought">Already bought</option>
              </select>
            </div>
            {status === "bought" &&
              <div><label>Purchase date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>}
            {kids.length > 0 &&
              <div><label>Student (optional)</label>
                <select value={kidId} onChange={e => setKidId(e.target.value)}>
                  <option value="">—</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}</option>)}
                </select>
              </div>}
          </div>
          <button className="primary" disabled={busy} style={{ marginTop: 14 }}>{busy ? "Checking…" : "Check it"}</button>
          {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        </form>
      </div>

      {res && v && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="sans" style={{ fontWeight: 700, fontSize: 13, padding: "5px 12px", borderRadius: 20, background: vc[2], color: vc[3] }}>
              {vc[0]}
            </span>
            {v.coreCitation && <span className="muted sans" style={{ fontSize: 13 }}>{v.coreCitation}</span>}
            {v.source === "keyword" && <span className="muted sans" style={{ fontSize: 12 }}>· basic match</span>}
          </div>

          <p className="sans" style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 12 }}>{v.reasoning}</p>

          {v.classification === "ambiguous" && (v.pushCore || v.pushNonCore) && (
            <div className="sans" style={{ fontSize: 13.5, marginTop: 6 }}>
              {v.pushCore && <p style={{ margin: "4px 0" }}><b>Leans core if:</b> {v.pushCore}</p>}
              {v.pushNonCore && <p style={{ margin: "4px 0" }}><b>Leans non-core if:</b> {v.pushNonCore}</p>}
            </div>
          )}

          {a && (
            <div className="sans" style={{ marginTop: 14, borderRadius: 12, padding: "12px 14px", background: tc[0], color: tc[1] }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.headline}</div>
              <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.55 }}>{a.detail}</div>
            </div>
          )}

          {a?.notices?.map((n, i) => (
            <div key={i} className="sans" style={{ marginTop: 10, borderRadius: 10, padding: "10px 12px", fontSize: 13, background: TONE[n.tone]?.[0] || "#fbf3e2", color: TONE[n.tone]?.[1] || "#7a5a12" }}>{n.text}</div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {v.classification !== "core" &&
              <button type="button" className="primary"
                onClick={() => router.push(`/dashboard/preapproval/new?desc=${encodeURIComponent(desc.slice(0, 300))}`)}>
                Start a pre-approval request
              </button>}
            <button type="button" className={v.classification === "core" ? "primary" : ""} onClick={continueToClaim}>Continue to build the claim</button>
            <button type="button" onClick={() => setRes(null)}>Check another</button>
          </div>

          <p className="finenote" style={{ marginTop: 14 }}>
            Classification is guidance based on the published rule text ({ruleVersion}). It is not a decision.
            The Department makes the final determination, and there is no guarantee of approval or reimbursement.
          </p>
        </div>
      )}
    </>
  );
}

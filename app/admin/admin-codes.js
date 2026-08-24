"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCode, setCodeActive } from "./actions";

export default function AdminCodes({ codes }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [grants, setGrants] = useState("family");
  const [months, setMonths] = useState("12");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function create() {
    setBusy(true); setMsg(null);
    const res = await createCode({ code, grants, months, maxUses, note });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    if (res.ok) { setCode(""); setMaxUses(""); setNote(""); router.refresh(); }
  }
  async function toggle(c) {
    await setCodeActive(c.code, !c.active);
    router.refresh();
  }

  return (
    <div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div><label>Code</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. FOUNDER25" /></div>
        <div><label>Grants</label>
          <select value={grants} onChange={e => setGrants(e.target.value)}>
            <option value="family">Family</option>
            <option value="provider">Provider</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div><label>Months</label><input value={months} onChange={e => setMonths(e.target.value)} inputMode="numeric" /></div>
        <div><label>Max uses (blank = ∞)</label><input value={maxUses} onChange={e => setMaxUses(e.target.value)} inputMode="numeric" placeholder="∞" /></div>
        <div><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Beta testers" /></div>
        <button className="primary" disabled={busy} onClick={create} style={{ minWidth: 90 }}>{busy ? "…" : "Create"}</button>
      </div>
      {msg && <p style={{ color: msg.ok ? "var(--teal)" : "var(--red)", fontSize: 13 }}>{msg.text}</p>}

      {codes.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {codes.map(c => (
            <div key={c.code} className="kid" style={{ alignItems: "center", padding: "10px 14px", opacity: c.active ? 1 : 0.55 }}>
              <div style={{ flex: 1 }}>
                <b className="sans" style={{ fontSize: 14 }}>{c.code}</b>
                <span className="sans" style={{ fontSize: 12.5, color: "var(--navy2)", fontWeight: 700 }}> · {c.grants} · {c.months} mo</span>
                <div className="muted sans" style={{ fontSize: 12.5 }}>
                  {c.uses}{c.max_uses ? `/${c.max_uses}` : ""} used{c.note ? ` · ${c.note}` : ""}{c.active ? "" : " · inactive"}
                </div>
              </div>
              <button type="button" className="sans" style={{ fontSize: 12 }} onClick={() => toggle(c)}>{c.active ? "Deactivate" : "Activate"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

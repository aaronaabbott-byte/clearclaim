"use client";
import { useState } from "react";
import { setRequestStatus } from "./actions";

const TRIGGER_LABEL = {
  ann_unanswered: "Ann couldn't answer",
  denial_unmapped: "Unrecognized denial reason",
  user_request: "Family requested",
  unsupported: "Unsupported case",
};
const STATUS_COLOR = { open: "#c0392b", planned: "#8a6d1f", shipped: "#1f8a5b", dismissed: "#5b667d" };

export default function RequestRow({ r }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(r.status);
  const [open, setOpen] = useState(false);

  async function set(next) {
    setBusy(true);
    const res = await setRequestStatus(r.signature, next);
    if (res.ok) setStatus(next);
    setBusy(false);
  }

  const samples = Array.isArray(r.samples) ? r.samples : [];
  return (
    <div className="kid" style={{ display: "block", padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="sans" style={{ fontSize: 15, fontWeight: 700, minWidth: 34 }}>{r.count}×</span>
        <span>
          <b className="sans" style={{ fontSize: 13.5 }}>{r.title || "(no text)"}</b>
          <span className="muted sans" style={{ display: "block", fontSize: 12 }}>
            {TRIGGER_LABEL[r.trigger] || r.trigger} · {(r.states || []).join(", ") || "—"} · last {new Date(r.last_seen).toLocaleDateString()}
          </span>
        </span>
        <span className="spacer" style={{ flex: 1 }} />
        <span className="sans" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: STATUS_COLOR[status] }}>{status}</span>
        {samples.length > 0 && <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => setOpen(o => !o)}>{open ? "Hide" : `Examples (${samples.length})`}</button>}
        {status !== "planned" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5 }} onClick={() => set("planned")}>Plan</button>}
        {status !== "shipped" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5, color: "#1f8a5b" }} onClick={() => set("shipped")}>Shipped</button>}
        {status !== "dismissed" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5, color: "#5b667d" }} onClick={() => set("dismissed")}>Dismiss</button>}
      </div>
      {open && (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          {samples.map((s, i) => (
            <div key={i} className="sans" style={{ fontSize: 12.5, color: "#5b667d", borderLeft: "3px solid #e6eaf3", paddingLeft: 10 }}>
              “{s.text}” <span className="muted">· {s.at ? new Date(s.at).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

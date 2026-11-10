"use client";
import { useState } from "react";
import { setClusterStatus } from "./actions";

const COLORS = { open: "#c0392b", auto_fixed: "#1f8a5b", acknowledged: "#8a6d1f", resolved: "#5b667d" };

export default function HealthRow({ c }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(c.status);

  async function set(next) {
    setBusy(true);
    const r = await setClusterStatus(c.signature, next);
    if (r.ok) setStatus(next);
    setBusy(false);
  }

  return (
    <div className="kid" style={{ display: "block", padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="sans" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: COLORS[status] || "#5b667d" }}>
          {status.replace("_", " ")}
        </span>
        <b className="sans" style={{ fontSize: 13.5 }}>{c.source || "app"}</b>
        <span className="muted sans" style={{ fontSize: 12.5 }}>{c.count}× · last {new Date(c.last_seen).toLocaleString()}</span>
        {c.auto_fix && <span className="sans" style={{ fontSize: 12, color: "#1f8a5b" }}>auto-fixed: {c.auto_fix}</span>}
        {c.needs_approval && status === "open" && <span className="sans" style={{ fontSize: 12, color: "#c0392b" }}>needs your call</span>}
        <span className="spacer" style={{ flex: 1 }} />
        {status !== "acknowledged" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5 }} onClick={() => set("acknowledged")}>Acknowledge</button>}
        {status !== "resolved" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5 }} onClick={() => set("resolved")}>Resolve</button>}
        {status !== "open" && <button type="button" disabled={busy} className="sans" style={{ fontSize: 12.5 }} onClick={() => set("open")}>Reopen</button>}
      </div>
      <div className="muted sans" style={{ fontSize: 12.5, marginTop: 6, wordBreak: "break-word" }}>{c.sample_message}</div>
    </div>
  );
}

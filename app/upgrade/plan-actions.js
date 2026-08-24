"use client";
import { useState } from "react";

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.url) throw new Error(data.error || "Something went wrong. Try again.");
  return data.url;
}

export function CheckoutButtons({ tier, monthly, yearly }) {
  const [busy, setBusy] = useState(null); // "month" | "year" | null
  const [err, setErr] = useState(null);

  async function go(interval) {
    setBusy(interval); setErr(null);
    try {
      window.location.href = await post("/api/stripe/checkout", { tier, interval });
    } catch (e) {
      setErr(e.message); setBusy(null);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="primary" disabled={!!busy} onClick={() => go("month")} style={{ flex: 1, minWidth: 130 }}>
          {busy === "month" ? "…" : `Subscribe — ${monthly}/mo`}
        </button>
        <button disabled={!!busy} onClick={() => go("year")} style={{ flex: 1, minWidth: 130 }}>
          {busy === "year" ? "…" : `Yearly — ${yearly}`}
        </button>
      </div>
      {err && <p className="sans" style={{ fontSize: 12.5, color: "var(--red)", marginTop: 6 }}>{err}</p>}
    </div>
  );
}

export function ManageBilling() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function go() {
    setBusy(true); setErr(null);
    try {
      window.location.href = await post("/api/stripe/portal", {});
    } catch (e) {
      setErr(e.message); setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 14 }}>
      <button disabled={busy} onClick={go} style={{ width: "100%" }}>
        {busy ? "Opening…" : "Manage billing"}
      </button>
      {err && <p className="sans" style={{ fontSize: 12.5, color: "var(--red)", marginTop: 6 }}>{err}</p>}
    </div>
  );
}

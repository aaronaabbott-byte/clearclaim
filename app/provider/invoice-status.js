"use client";
import { useState } from "react";
import { setInvoiceStatus } from "./actions";

// A clickable paid/unpaid pill on each invoice row. Click toggles it.
export default function InvoiceStatus({ id, status }) {
  const [paid, setPaid] = useState(status === "paid");
  const [busy, setBusy] = useState(false);

  async function toggle(e) {
    e.preventDefault(); e.stopPropagation();
    setBusy(true);
    const next = paid ? "unpaid" : "paid";
    const r = await setInvoiceStatus(id, next);
    if (r?.ok) setPaid(next === "paid");
    setBusy(false);
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} title="Click to toggle"
      className="sans"
      style={{
        fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 5, cursor: "pointer",
        border: `1px solid ${paid ? "#bfe3d4" : "#e7d3a6"}`,
        background: paid ? "#e7f4ee" : "#fdf7e8",
        color: paid ? "#0f5b52" : "#8a6d1a",
      }}>
      {busy ? "…" : paid ? "Paid" : "Unpaid"}
    </button>
  );
}

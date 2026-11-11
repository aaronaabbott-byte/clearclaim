"use client";
import { useState } from "react";

// A slim, tappable section header that reveals its (server-rendered) children
// cards when opened. Used to tuck secondary dashboard sections away so the main
// view stays short. Children render as their own sibling cards below the bar.
export default function Collapsible({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="card" style={{ padding: "12px 16px" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0, textAlign: "left" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          {subtitle && <span className="muted sans hide-sm" style={{ fontSize: 13 }}>{subtitle}</span>}
          <span className="spacer" style={{ flex: 1 }} />
          <span className="sans" style={{ fontSize: 13, fontWeight: 600, color: "var(--navy2)", whiteSpace: "nowrap" }}>
            {open ? "Hide ▲" : "Show ▼"}
          </span>
        </button>
      </div>
      {open && children}
    </>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "./actions";

// A single hamburger menu that holds all the header actions. Keeps the top bar
// clean, especially on phones.
export default function HeaderMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const linkStyle = { display: "block", padding: "11px 16px", color: "var(--ink)", textDecoration: "none", fontFamily: "var(--sans)", fontSize: 14.5, borderBottom: "1px solid var(--line)" };

  return (
    <div style={{ position: "relative" }}>
      <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}
        style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40", padding: "8px 12px", fontSize: 18, lineHeight: 1 }}>
        ☰
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 41, background: "#fff",
            border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 10px 30px rgba(20,30,45,.18)", minWidth: 200, overflow: "hidden" }}>
            {items.map((it, i) => (
              <Link key={i} href={it.href} onClick={() => setOpen(false)} style={linkStyle}>{it.label}</Link>
            ))}
            <form action={signOut}>
              <button type="submit" style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px",
                background: "#fff", border: "none", color: "var(--red)", fontFamily: "var(--sans)", fontSize: 14.5, cursor: "pointer" }}>
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

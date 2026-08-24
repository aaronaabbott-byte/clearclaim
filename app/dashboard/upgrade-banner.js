"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// One-time, dismissible nudge for free users. Dismissal is remembered per browser
// via localStorage so we don't nag on every visit.
const KEY = "cc_upgrade_banner_dismissed";

export default function UpgradeBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); } }, []);
  if (!show) return null;
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderColor: "var(--gold)", background: "#fbf7ef" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <b className="sans" style={{ fontSize: 14.5 }}>You're on the free plan.</b>{" "}
        <span className="sans muted" style={{ fontSize: 14 }}>Unlock Ask Ann, AI eligibility with reasoning, unlimited students, pre-approval help, and redaction.</span>
      </div>
      <Link href="/upgrade"><button className="primary">See plans</button></Link>
      <button type="button" aria-label="Dismiss"
        onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); }}
        style={{ padding: "6px 10px" }}>✕</button>
    </div>
  );
}

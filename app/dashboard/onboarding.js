"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// First-run card for new families: add a student -> file your first claim ->
// download the packet. Rendered by the dashboard only until the family has filed
// a claim; the family can also hide it. Dismissal is remembered per browser.
export default function Onboarding({ hasStudents }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem("cc_onboarding_done") === "1"); } catch { setHidden(false); } }, []);
  if (hidden) return null;

  function dismiss() { try { localStorage.setItem("cc_onboarding_done", "1"); } catch { /* ignore */ } setHidden(true); }

  const steps = [
    { done: hasStudents, title: "Add your student", body: "Just a first name and grade — nothing sensitive, and no account or bank numbers, ever." },
    { done: false, title: "File your first claim", body: "Snap a photo of a receipt and let ClearClaim read it, draft the educational-use note, and run the rules check." },
    { done: false, title: "Download your packet", body: "One clean PDF with everything a reviewer needs — you submit it in your program's portal." },
  ];
  const next = hasStudents
    ? { label: "Start a claim", href: "/dashboard/claims/new" }
    : { label: "Add a student", href: "/dashboard/settings" };

  return (
    <div className="card" style={{ background: "linear-gradient(180deg,#f2f6fb,#fff)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Welcome to ClearClaim</h2>
        <span className="muted sans" style={{ fontSize: 13 }}>Three steps to your first reimbursement packet</span>
        <span className="spacer" style={{ flex: 1 }} />
        <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={dismiss}>Hide</button>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 10, alignItems: "start" }}>
            <span className="sans" style={{
              width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: s.done ? "var(--teal)" : "#fff", color: s.done ? "#fff" : "var(--navy2)",
              border: s.done ? "none" : "1px solid var(--navy2)",
            }}>{s.done ? "✓" : i + 1}</span>
            <div>
              <div className="sans" style={{ fontWeight: 600, fontSize: 14.5, color: s.done ? "var(--muted)" : "var(--ink)" }}>{s.title}</div>
              <div className="muted sans" style={{ fontSize: 13 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <Link href={next.href}><button className="primary">{next.label}</button></Link>
        <Link href="/dashboard/eligibility" className="sans" style={{ fontSize: 13, color: "var(--navy2)" }}>Not sure something qualifies? Check an item first</Link>
      </div>
    </div>
  );
}

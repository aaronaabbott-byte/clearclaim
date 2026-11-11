"use client";
import { useEffect, useState } from "react";

// One-time "what's new" popup. Shows once per browser on the next dashboard
// visit, then remembers it's been seen. To announce something new later, bump
// UPDATE_KEY and everyone sees the popup again.
const UPDATE_KEY = "2026-11-11-reminders-and-ann";
const STORAGE_KEY = "cc_update_seen";

export default function UpdateModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== UPDATE_KEY) setShow(true);
    } catch { /* storage blocked — just don't show */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, UPDATE_KEY); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,22,36,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, maxWidth: 440, width: "100%",
          boxShadow: "0 20px 60px rgba(15,22,36,.35)", overflow: "hidden",
        }}
      >
        <div style={{ background: "#15264b", padding: "16px 22px", color: "#fff" }}>
          <div style={{ fontSize: 12.5, letterSpacing: ".08em", textTransform: "uppercase", opacity: .8 }}>What's new</div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>A few updates to ClearClaim</div>
        </div>

        <div style={{ padding: "20px 22px", color: "#1f2a44", fontSize: 14.5, lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 14px" }}>
            We shipped some improvements to make reimbursements easier:
          </p>

          {/* Highlighted feature: Ann feedback */}
          <div style={{
            border: "1px solid #dbe6f5", background: "linear-gradient(180deg,#f2f6fb,#fff)",
            borderRadius: 12, padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>
              <span style={{ background: "#15264b", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, letterSpacing: ".04em", marginRight: 7, verticalAlign: "middle" }}>NEW</span>
              Help shape ClearClaim through Ask Ann
            </div>
            Two ways to tell us what you need: if Ann's answer doesn't solve your question, tap
            <b> "This didn't answer my question"</b> under her reply. Or just <b>tell Ann what you'd like</b>:
            say "I wish ClearClaim could..." and she'll pass the idea straight to our team. Both directly shape
            what we build next.
          </div>

          <ul style={{ margin: 0, paddingLeft: 18, color: "#45506a" }}>
            <li style={{ marginBottom: 7 }}>
              <b>Activity &amp; course checklists.</b> New guided checklists tell you exactly what an
              extracurricular activity or co-curricular course needs to be approved, which documents to
              attach, and can <b>write the justification for you</b>. Find them on your dashboard.
            </li>
            <li style={{ marginBottom: 7 }}>
              <b>Email reminders.</b> We'll email you when a claim you've marked ready is still missing a
              receipt, proof of payment, or note, and before the budget-year deadline. Turn these on or off
              in <b>Settings, under Email reminders</b>.
            </li>
            <li style={{ marginBottom: 7 }}>
              <b>Shareable document links.</b> Generate a clean link for any uploaded document — handy when
              you'd rather share a link than upload a file.
            </li>
            <li>
              <b>New pre-approval portal.</b> Arkansas moved pre-approval to an online portal (it's no longer a
              Google Form, and it now takes document uploads). Our Pre-approvals tool preps your answers to paste in.
            </li>
          </ul>
        </div>

        <div style={{ padding: "0 22px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: "#15264b", color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

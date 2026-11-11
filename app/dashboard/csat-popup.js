"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Periodic 1-5 CSAT popup. Shows at most once per ~30 days per browser (7 days
// if dismissed without answering), as a small corner card. Waits until the
// "what's new" popup has been seen so two popups never stack.
const THROTTLE_KEY = "cc_csat_until";     // ms timestamp; don't show before this
const UPDATE_SEEN_KEY = "cc_update_seen"; // set by the what's-new modal
const ANSWERED_DAYS = 30;
const DISMISSED_DAYS = 7;
const SHOW_DELAY_MS = 8000;               // let them settle in first
const DAY = 86400000;

export default function CsatPopup() {
  const supabase = createClient();
  const [show, setShow] = useState(false);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let t;
    try {
      const until = Number(localStorage.getItem(THROTTLE_KEY) || 0);
      const updateSeen = !!localStorage.getItem(UPDATE_SEEN_KEY);
      // Only if we're past the throttle window AND the what's-new popup is done.
      if (Date.now() >= until && updateSeen) {
        t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
      }
    } catch { /* storage blocked — don't show */ }
    return () => clearTimeout(t);
  }, []);

  function snooze(days) {
    try { localStorage.setItem(THROTTLE_KEY, String(Date.now() + days * DAY)); } catch { /* ignore */ }
  }

  function dismiss() {
    if (!done) snooze(DISMISSED_DAYS);
    setShow(false);
  }

  async function submit() {
    if (!score) return;
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        await supabase.from("csat_responses").insert({
          user_id: uid, score, comment: comment.trim().slice(0, 500) || null,
        });
      }
    } catch { /* best effort — never block the family */ }
    snooze(ANSWERED_DAYS);
    setBusy(false);
    setDone(true);
    setTimeout(() => setShow(false), 1800);
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", right: 18, bottom: 18, zIndex: 900, width: 320, maxWidth: "calc(100vw - 36px)",
      background: "#fff", border: "1px solid #e6eaf3", borderRadius: 14,
      boxShadow: "0 14px 40px rgba(15,22,36,.22)", overflow: "hidden",
      fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
    }}>
      {done ? (
        <div style={{ padding: "18px 18px", color: "#1f2a44", fontSize: 14.5 }}>
          Thanks for the feedback!
        </div>
      ) : (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: "#1f2a44" }}>
              How satisfied are you with ClearClaim?
            </div>
            <button type="button" onClick={dismiss} aria-label="Close"
              style={{ background: "none", border: "none", color: "#8792a8", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 4, margin: "12px 0 4px" }}
               onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                onMouseEnter={() => setHover(n)}
                onClick={() => setScore(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 3px",
                  fontSize: 26, lineHeight: 1, color: (hover || score) >= n ? "#f0a500" : "#d4dae6",
                }}>★</button>
            ))}
          </div>

          {score > 0 && (
            <>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Anything you'd like to add? (optional)" rows={2}
                style={{ width: "100%", marginTop: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={dismiss} className="sans" style={{ fontSize: 13 }}>Not now</button>
                <button type="button" onClick={submit} disabled={busy}
                  style={{ background: "#15264b", color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
                  {busy ? "Sending..." : "Submit"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

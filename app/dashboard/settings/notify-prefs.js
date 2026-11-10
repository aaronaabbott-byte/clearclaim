"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Email reminder toggles. Writes straight to the user's own profile row (the
// "own profile" RLS policy allows it). Defaults are ON.
export default function NotifyPrefs({ userId, email, deadlines }) {
  const supabase = createClient();
  const [emailOn, setEmailOn] = useState(email !== false);
  const [deadlineOn, setDeadlineOn] = useState(deadlines !== false);
  const [msg, setMsg] = useState("");

  async function save(next) {
    setMsg("");
    const { error } = await supabase.from("profiles").update(next).eq("user_id", userId);
    setMsg(error ? "Couldn't save — try again." : "Saved.");
  }

  function Toggle({ on, set, field, label, help }) {
    return (
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", cursor: "pointer" }}>
        <input type="checkbox" checked={on} style={{ marginTop: 3 }}
          onChange={e => { const v = e.target.checked; set(v); save({ [field]: v }); }} />
        <span>
          <b className="sans" style={{ fontSize: 14 }}>{label}</b>
          <span className="muted sans" style={{ display: "block", fontSize: 12.5 }}>{help}</span>
        </span>
      </label>
    );
  }

  return (
    <div className="card">
      <h2>Email reminders</h2>
      <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 6 }}>
        ClearClaim can email you about your own claims. We never share your address or send marketing.
      </p>
      <Toggle on={emailOn} set={setEmailOn} field="notify_email"
        label="Claim updates"
        help="When a claim is approved, or when one you've marked ready is still missing a receipt, proof of payment, or note." />
      <Toggle on={deadlineOn} set={setDeadlineOn} field="notify_deadlines"
        label="Budget-year deadline reminders"
        help="A heads-up 30 and 7 days before the reimbursement budget year ends." />
      {msg && <p className="sans" style={{ fontSize: 12.5, color: msg === "Saved." ? "var(--teal)" : "var(--red)", marginTop: 4 }}>{msg}</p>}
    </div>
  );
}

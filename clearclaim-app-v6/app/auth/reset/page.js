"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) { setErr("Use at least 8 characters."); return; }
    setBusy(true);
    // The recovery link established a session via /auth/callback, so we can set a new password.
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErr(error.message); setBusy(false); return; }
    setDone(true);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1200);
  }

  return (
    <div className="authwrap"><div className="authcard">
      <img src="/wordmark.png" alt="ClearClaim" style={{ width: "min(300px,80%)", display: "block", margin: "0 auto 10px" }} />
      <span className="tag">Set a new password</span>
      {done ? (
        <p style={{ color: "var(--teal)" }}>Password updated. Taking you to your dashboard…</p>
      ) : (
        <form onSubmit={submit}>
          <label style={{ textAlign: "left" }}>New password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters" autoComplete="new-password" />
          <button className="primary" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
            {busy ? "Saving…" : "Save new password"}
          </button>
          {err && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{err}</p>}
        </form>
      )}
      <p className="muted sans" style={{ fontSize: 12, marginTop: 18 }}>
        Open this page from the reset link in your email so it can verify it's you.
      </p>
    </div></div>
  );
}

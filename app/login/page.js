"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function sendReset() {
    setErr(""); setNote("");
    if (!email) { setErr("Enter your email first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/auth/reset`,
    });
    setBusy(false);
    error ? setErr(error.message) : setNote("Check your email for a link to reset your password.");
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setNote(""); setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) { setErr("Use a password of at least 8 characters."); setBusy(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) { setErr(error.message); setBusy(false); return; }
        if (data.session) {
          // Email confirmation is off — signed in right away.
          router.push("/dashboard"); router.refresh(); return;
        }
        // Email confirmation is on — user must verify before signing in.
        setNote("Account created. Check your email to confirm it, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setErr(error.message); setBusy(false); return; }
        router.push("/dashboard"); router.refresh(); return;
      }
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <div className="authwrap"><div className="authcard">
      <img src="/wordmark.png" alt="ClearClaim" style={{ width: "min(300px,80%)", display: "block", margin: "0 auto 10px" }} />
      <span className="tag">Every claim, ready to approve.</span>

      <div className="sans" style={{ display: "flex", gap: 6, background: "#eef2f7", padding: 4, borderRadius: 12, margin: "6px 0 18px" }}>
        {[["signin", "Sign in"], ["signup", "Create account"]].map(([m, label]) => (
          <button key={m} type="button" onClick={() => { setMode(m); setErr(""); setNote(""); }}
            style={{
              flex: 1, border: "none", borderRadius: 9, padding: "8px 0",
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "var(--navy)" : "var(--muted)",
              fontWeight: mode === m ? 700 : 500,
              boxShadow: mode === m ? "var(--sh)" : "none",
            }}>{label}</button>
        ))}
      </div>

      <form onSubmit={submit}>
        <label style={{ textAlign: "left" }}>Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <label style={{ textAlign: "left", marginTop: 10 }}>Password</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        <button className="primary" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      {mode === "signin" && (
        <button type="button" onClick={sendReset} disabled={busy} className="sans"
          style={{ border: "none", background: "none", color: "var(--navy2)", fontSize: 13, marginTop: 12, cursor: "pointer" }}>
          Forgot password?
        </button>
      )}

      {err && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{err}</p>}
      {note && <p style={{ color: "var(--teal)", fontSize: 13, marginTop: 12 }}>{note}</p>}

      <p className="muted sans" style={{ fontSize: 12, marginTop: 18 }}>
        Your account keeps you signed in on this device. Data is private to your account.
      </p>
    </div></div>
  );
}

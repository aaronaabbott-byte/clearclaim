"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const supabase = createClient();
  async function sendLink(e) {
    e.preventDefault(); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    error ? setErr(error.message) : setSent(true);
  }
  async function google() {
    await supabase.auth.signInWithOAuth({ provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` } });
  }
  return (
    <div className="authwrap"><div className="authcard">
      <img src="/wordmark.png" alt="ClearClaim" style={{width:"min(300px,80%)",display:"block",margin:"0 auto 10px"}}/>
      <span className="tag">Every claim, ready to approve.</span>
      {sent ? <p>Check your email for a sign-in link.</p> : (
        <form onSubmit={sendLink}>
          <label style={{textAlign:"left"}}>Email</label>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/>
          <button className="primary" style={{width:"100%",marginTop:12}}>Email me a sign-in link</button>
          <button type="button" onClick={google} style={{width:"100%",marginTop:8}}>Continue with Google</button>
          {err && <p style={{color:"#b3261e",fontSize:13}}>{err}</p>}
        </form>
      )}
      <p className="muted" style={{fontSize:12,marginTop:18}}>Your data is private to your account.</p>
    </div></div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RedeemCode() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function redeem() {
    if (!code.trim()) { setMsg({ ok: false, text: "Enter a code first." }); return; }
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("redeem_code", { p_code: code.trim() });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    const ok = String(data).toLowerCase().startsWith("success");
    setMsg({ ok, text: String(data) });
    if (ok) { router.refresh(); setTimeout(() => router.push("/dashboard"), 1300); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter an access code" style={{ maxWidth: 260 }} />
        <button className="primary" disabled={busy} onClick={redeem}>{busy ? "Checking…" : "Redeem"}</button>
      </div>
      {msg && <p style={{ color: msg.ok ? "var(--teal)" : "var(--red)", fontSize: 13, marginTop: 8 }}>{msg.text}</p>}
    </div>
  );
}

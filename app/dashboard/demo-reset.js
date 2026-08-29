"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shown only on the demo account. Wipes + reseeds a fresh demo via the
// reset_demo() database function (which self-checks it's the demo account).
export default function DemoReset() {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function reset() {
    setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("reset_demo");
    setBusy(false);
    if (error) { setMsg("Reset failed: " + error.message); return; }
    setMsg(typeof data === "string" ? data : "Demo reset.");
    router.refresh();
  }

  return (
    <div className="card" style={{ borderColor: "var(--gold)", background: "#fffdf5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b className="sans">Demo account</b>
          <div className="muted sans" style={{ fontSize: 13, marginTop: 2 }}>
            Reset to a fresh Arizona demo — sample students, a curriculum document, and a claim. Flip the state map in
            Settings to show Arkansas.
          </div>
        </div>
        <button className="primary" disabled={busy} onClick={reset}>{busy ? "Resetting…" : "↻ Reset demo"}</button>
      </div>
      {msg && <p className="sans" style={{ fontSize: 13, marginTop: 8, color: "var(--teal)" }}>{msg}</p>}
    </div>
  );
}

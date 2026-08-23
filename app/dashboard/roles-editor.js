"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Turn parent / provider on or off for your own account.
export default function RolesEditor({ profile, userId }) {
  const router = useRouter();
  const supabase = createClient();
  const [isParent, setIsParent] = useState(profile?.is_parent ?? true);
  const [isProvider, setIsProvider] = useState(profile?.is_provider ?? false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    if (!isParent && !isProvider) { setErr("Keep at least one role."); setBusy(false); return; }
    const { error } = await supabase.from("profiles").upsert({ user_id: userId, is_parent: isParent, is_provider: isProvider });
    setBusy(false);
    if (error) { setErr("Could not save: " + error.message); return; }
    setMsg("Saved."); router.refresh();
  }

  return (
    <div>
      <label className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer", marginBottom: 6 }}>
        <input type="checkbox" checked={isParent} onChange={e => setIsParent(e.target.checked)} style={{ width: 17, height: 17 }} />
        Parent / guardian
      </label>
      <label className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={isProvider} onChange={e => setIsProvider(e.target.checked)} style={{ width: 17, height: 17 }} />
        Provider / vendor
      </label>
      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
      <button disabled={busy} onClick={save} style={{ marginTop: 10 }}>{busy ? "Saving…" : "Save roles"}</button>
    </div>
  );
}

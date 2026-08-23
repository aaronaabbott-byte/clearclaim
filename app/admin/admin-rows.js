"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetAccount, deleteAccount } from "./actions";

export default function AdminRow({ u }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // "reset" | "delete" | null
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const date = (s) => s ? new Date(s).toLocaleDateString() : "—";

  async function run() {
    setBusy(true); setNote(null);
    const fn = mode === "delete" ? deleteAccount : resetAccount;
    const res = await fn(u.id, u.email, confirm);
    setBusy(false);
    if (res.ok) {
      setNote({ ok: true, text: res.message });
      setMode(null); setConfirm("");
      router.refresh();
    } else {
      setNote({ ok: false, text: res.error });
    }
  }

  return (
    <div className="kid" style={{ display: "block", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b className="sans" style={{ fontSize: 14.5 }}>{u.email}</b>
          <div className="muted sans" style={{ fontSize: 12.5 }}>
            {u.kids} student{u.kids === 1 ? "" : "s"} · {u.claims} claim{u.claims === 1 ? "" : "s"} · {u.preapprovals} pre-approval{u.preapprovals === 1 ? "" : "s"}
            {" · "}joined {date(u.created_at)}{u.last_sign_in_at ? ` · last in ${date(u.last_sign_in_at)}` : ""}
          </div>
        </div>
        {mode === null && (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => { setMode("reset"); setConfirm(""); setNote(null); }}>Reset data</button>
            <button type="button" className="sans" style={{ fontSize: 13, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => { setMode("delete"); setConfirm(""); setNote(null); }}>Delete account</button>
          </div>
        )}
      </div>

      {mode && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: mode === "delete" ? "#fdf3f2" : "#f6f9fc" }}>
          <div className="sans" style={{ fontSize: 13.5, marginBottom: 8 }}>
            {mode === "delete"
              ? <>This permanently deletes <b>{u.email}</b>, their login, and all their data. This cannot be undone.</>
              : <>This clears all data for <b>{u.email}</b> but keeps their login so they can start fresh.</>}
            {" "}To confirm, type their email below.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={u.email}
              style={{ maxWidth: 280 }} autoComplete="off" />
            <button type="button" className="sans" disabled={busy || confirm.trim().toLowerCase() !== u.email.toLowerCase()}
              style={{ fontSize: 13, background: mode === "delete" ? "var(--red)" : "var(--navy2)", color: "#fff", borderColor: "transparent", opacity: (confirm.trim().toLowerCase() !== u.email.toLowerCase()) ? 0.5 : 1 }}
              onClick={run}>
              {busy ? "Working…" : (mode === "delete" ? "Delete permanently" : "Reset now")}
            </button>
            <button type="button" className="sans" style={{ fontSize: 13 }} disabled={busy} onClick={() => { setMode(null); setConfirm(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {note && <p className="sans" style={{ fontSize: 13, marginTop: 8, color: note.ok ? "var(--teal)" : "var(--red)" }}>{note.text}</p>}
    </div>
  );
}

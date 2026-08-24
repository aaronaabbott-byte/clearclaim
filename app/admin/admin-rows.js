"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetAccount, deleteAccount, setUserRoles, grantPlan, revokePlan } from "./actions";

export default function AdminRow({ u }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // "reset" | "delete" | "roles" | null
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [isParent, setIsParent] = useState(u.is_parent);
  const [isProvider, setIsProvider] = useState(u.is_provider);
  const [planTier, setPlanTier] = useState("family");
  const [planMonths, setPlanMonths] = useState("12");

  const active = (d) => d && String(d) >= new Date().toISOString().slice(0, 10);
  const planLabel = [active(u.family_until) && `Family→${u.family_until}`, active(u.provider_until) && `Provider→${u.provider_until}`].filter(Boolean).join(" · ") || "Free";

  async function saveGrant() {
    setBusy(true); setNote(null);
    const res = await grantPlan(u.id, planTier, planMonths);
    setBusy(false);
    if (res.ok) { setNote({ ok: true, text: res.message }); setMode(null); router.refresh(); }
    else setNote({ ok: false, text: res.error });
  }
  async function doRevoke() {
    setBusy(true); setNote(null);
    const res = await revokePlan(u.id);
    setBusy(false);
    if (res.ok) { setNote({ ok: true, text: res.message }); setMode(null); router.refresh(); }
    else setNote({ ok: false, text: res.error });
  }

  async function saveRoles() {
    setBusy(true); setNote(null);
    const res = await setUserRoles(u.id, isParent, isProvider);
    setBusy(false);
    if (res.ok) { setNote({ ok: true, text: res.message }); setMode(null); router.refresh(); }
    else setNote({ ok: false, text: res.error });
  }

  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const date = (s) => s ? new Date(s).toLocaleDateString() : "—";
  const datetime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "never";

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
            <span style={{ color: "var(--navy2)", fontWeight: 700 }}>{[u.is_parent && "Parent", u.is_provider && "Provider"].filter(Boolean).join(" + ") || "No role"}</span>
            {u.is_parent ? <> · {u.kids} student{u.kids === 1 ? "" : "s"} · {u.claims} claim{u.claims === 1 ? "" : "s"} · {u.preapprovals} pre-approval{u.preapprovals === 1 ? "" : "s"}</> : null}
          </div>
          {u.is_provider && (
            <div className="muted sans" style={{ fontSize: 12.5, marginTop: 2 }}>
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>Provider</span>{" · "}
              {u.p_classes} class{u.p_classes === 1 ? "" : "es"} · {u.p_docs} doc{u.p_docs === 1 ? "" : "s"} · {u.p_items} menu item{u.p_items === 1 ? "" : "s"} · {u.p_invoices} invoice{u.p_invoices === 1 ? "" : "s"}{u.p_invoice_total ? ` (${money(u.p_invoice_total)})` : ""}
            </div>
          )}
          <div className="muted sans" style={{ fontSize: 12, marginTop: 3 }}>
            <span style={{ color: planLabel === "Free" ? "var(--muted)" : "var(--teal)", fontWeight: 700 }}>Plan: {planLabel}</span>
            {" · "}Last access: <b style={{ color: "var(--ink)" }}>{datetime(u.last_sign_in_at)}</b> · joined {date(u.created_at)}
          </div>
        </div>
        {mode === null && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => { setMode("plan"); setNote(null); }}>Plan</button>
            <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => { setMode("roles"); setIsParent(u.is_parent); setIsProvider(u.is_provider); setNote(null); }}>Roles</button>
            <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => { setMode("reset"); setConfirm(""); setNote(null); }}>Reset data</button>
            <button type="button" className="sans" style={{ fontSize: 13, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => { setMode("delete"); setConfirm(""); setNote(null); }}>Delete account</button>
          </div>
        )}
      </div>

      {mode === "roles" && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#f6f9fc" }}>
          <div className="sans" style={{ fontSize: 13.5, marginBottom: 8 }}>Set which views this account has:</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <label className="sans" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5 }}>
              <input type="checkbox" checked={isParent} onChange={e => setIsParent(e.target.checked)} /> Parent
            </label>
            <label className="sans" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5 }}>
              <input type="checkbox" checked={isProvider} onChange={e => setIsProvider(e.target.checked)} /> Provider
            </label>
            <button type="button" className="sans" disabled={busy || (!isParent && !isProvider)}
              style={{ fontSize: 13, background: "var(--navy2)", color: "#fff", borderColor: "transparent", opacity: (!isParent && !isProvider) ? 0.5 : 1 }}
              onClick={saveRoles}>{busy ? "Saving…" : "Save roles"}</button>
            <button type="button" className="sans" style={{ fontSize: 13 }} disabled={busy} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "plan" && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#f6f9fc" }}>
          <div className="sans" style={{ fontSize: 13.5, marginBottom: 8 }}>Comp a paid plan for <b>{u.email}</b> (no card). Current: <b>{planLabel}</b></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={planTier} onChange={e => setPlanTier(e.target.value)} className="sans" style={{ fontSize: 13 }}>
              <option value="family">Family</option>
              <option value="provider">Provider</option>
              <option value="both">Both</option>
            </select>
            <label className="sans" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <input value={planMonths} onChange={e => setPlanMonths(e.target.value)} inputMode="numeric" style={{ width: 64 }} /> months
            </label>
            <button type="button" className="sans" disabled={busy}
              style={{ fontSize: 13, background: "var(--navy2)", color: "#fff", borderColor: "transparent" }}
              onClick={saveGrant}>{busy ? "Saving…" : "Grant / extend"}</button>
            <button type="button" className="sans" disabled={busy} style={{ fontSize: 13, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={doRevoke}>Revoke all</button>
            <button type="button" className="sans" style={{ fontSize: 13 }} disabled={busy} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {(mode === "reset" || mode === "delete") && (
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

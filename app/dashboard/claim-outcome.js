"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClaimOutcome({ claim }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState(claim.outcome || "approved");
  const [reason, setReason] = useState(claim.outcome_reason || "");
  const [date, setDate] = useState(claim.outcome_date || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await supabase.from("claims").update({
      outcome, outcome_reason: outcome === "denied" ? (reason || null) : null,
      outcome_date: date || null,
      status: outcome === "approved" ? "submitted" : claim.status,
    }).eq("id", claim.id);
    setBusy(false); setOpen(false); router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this claim? This can't be undone.")) return;
    setBusy(true);
    try {
      const paths = (Array.isArray(claim.files) ? claim.files : []).map(f => f?.path).filter(Boolean);
      if (paths.length) await supabase.storage.from("documents").remove(paths);
    } catch { /* file cleanup is best-effort */ }
    await supabase.from("claims").delete().eq("id", claim.id);
    setBusy(false); router.refresh();
  }

  const badge = claim.outcome === "approved" ? ["Approved", "var(--teal)"]
    : claim.outcome === "denied" ? ["Denied", "var(--red)"] : null;

  if (!open) {
    return (
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <button type="button" className="sans" onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 10px" }}>
          {badge ? `${badge[0]} · edit` : "Report outcome"}
        </button>
        <button type="button" className="sans" disabled={busy} onClick={remove} title="Delete claim"
          style={{ fontSize: 12, padding: "4px 9px", color: "var(--red)", borderColor: "#e3b7b3" }}>Delete</button>
      </span>
    );
  }
  return (
    <div className="sans" style={{ width: "100%", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <div className="row">
        <div><label>Outcome</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>
      {outcome === "denied" && (
        <div style={{ marginTop: 8 }}>
          <label>Reviewer's reason (helps us learn)</label>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Paste what the reviewer said" />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save outcome"}</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

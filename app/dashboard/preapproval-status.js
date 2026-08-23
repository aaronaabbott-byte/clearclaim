"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { denialClocks } from "@/lib/preapproval";

const LABEL = { draft: ["Draft", "var(--muted)"], submitted: ["Submitted", "var(--navy2)"], approved: ["Approved", "var(--teal)"], denied: ["Denied", "var(--red)"] };
const clk = denialClocks();

export default function PreapprovalStatus({ req }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(req.status || "draft");
  const [decisionDate, setDecisionDate] = useState(req.decision_date || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await supabase.from("preapprovals").update({
      status, decision_date: (status === "approved" || status === "denied") ? (decisionDate || null) : null,
    }).eq("id", req.id);
    setBusy(false); setOpen(false); router.refresh();
  }

  const [label, color] = LABEL[req.status] || LABEL.draft;

  if (!open) {
    return <button type="button" className="sans" onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 10px", color }}>{label} · update</button>;
  }
  return (
    <div className="sans" style={{ width: "100%", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <div className="row">
        <div><label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">Draft (not sent)</option>
            <option value="submitted">Submitted / no response yet</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        {(status === "approved" || status === "denied") &&
          <div><label>{status === "denied" ? "Denial date" : "Approval date"}</label><input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)} /></div>}
      </div>
      {status === "denied" &&
        <p className="finenote" style={{ marginTop: 8 }}>
          Denied expenses can be reevaluated. The rule ({clk.citation}) states a reevaluation must be resubmitted
          "{clk.wording} {clk.reevaluationDays} days" from the denial, and a final review requested "{clk.wording} {clk.finalReviewDays} days"
          from a second denial. We show the rule's exact wording; confirm the current process with the Department.
        </p>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save status"}</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

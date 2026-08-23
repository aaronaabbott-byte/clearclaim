"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMPLIANCE_ITEMS, schoolYearLabel } from "@/lib/compliance";

// Homeschool compliance checklist for the current school year. Shown only to
// families with a homeschool student. Each item is a simple done/not-done toggle.
export default function ComplianceTracker({ userId, initialDone = {} }) {
  const router = useRouter();
  const supabase = createClient();
  const year = schoolYearLabel();
  const [done, setDone] = useState(initialDone);
  const [busy, setBusy] = useState("");

  async function toggle(key) {
    const next = !done[key];
    setDone(d => ({ ...d, [key]: next }));
    setBusy(key);
    await supabase.from("compliance").upsert(
      { user_id: userId, item_key: key, school_year: year, done: next, done_date: next ? new Date().toISOString().slice(0, 10) : null },
      { onConflict: "user_id,item_key,school_year" }
    );
    setBusy("");
    router.refresh();
  }

  const completed = COMPLIANCE_ITEMS.filter(i => done[i.key]).length;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Homeschool deadlines</h2>
        <span className="muted sans" style={{ fontSize: 13 }}>{year} · {completed} of {COMPLIANCE_ITEMS.length} done</span>
      </div>
      <p className="muted sans" style={{ fontSize: 13, marginTop: 8 }}>
        Yearly homeschool to-dos. Check them off as you finish. Dates are guidance — confirm the current ones with the ADE.
      </p>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {COMPLIANCE_ITEMS.map(i => {
          const on = !!done[i.key];
          return (
            <label key={i.key} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "start",
              border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", cursor: "pointer",
              background: on ? "#f2f8f6" : "#fff", opacity: busy === i.key ? 0.6 : 1 }}>
              <input type="checkbox" checked={on} onChange={() => toggle(i.key)} style={{ width: 18, height: 18, marginTop: 1 }} />
              <div>
                <div className="sans" style={{ fontWeight: 700, fontSize: 14, textDecoration: on ? "line-through" : "none", color: on ? "var(--muted)" : "var(--ink)" }}>{i.title}</div>
                <div className="muted sans" style={{ fontSize: 13 }}>{i.detail}</div>
              </div>
              <span className="sans" style={{ fontSize: 12, fontWeight: 700, color: "var(--navy2)", whiteSpace: "nowrap" }}>{i.when}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

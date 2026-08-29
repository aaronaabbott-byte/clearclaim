"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STATE_META, STATUS_LABEL, getStateConfig, isSupportedState } from "@/lib/states";

// Stylized US tile-grid: each state sits in a (row,col) cell. Not to scale — a
// clean, maintainable picker that stays recognizable and works on phones.
const GRID = {
  AK: [0, 0], ME: [0, 10],
  VT: [1, 9], NH: [1, 10],
  WA: [2, 0], ID: [2, 1], MT: [2, 2], ND: [2, 3], MN: [2, 4], WI: [2, 5], IL: [2, 6], MI: [2, 7], NY: [2, 8], MA: [2, 9], RI: [2, 10],
  OR: [3, 0], NV: [3, 1], WY: [3, 2], SD: [3, 3], IA: [3, 4], IN: [3, 5], OH: [3, 6], PA: [3, 7], NJ: [3, 8], CT: [3, 9],
  CA: [4, 0], UT: [4, 1], CO: [4, 2], NE: [4, 3], MO: [4, 4], KY: [4, 5], WV: [4, 6], VA: [4, 7], MD: [4, 8], DE: [4, 9],
  AZ: [5, 1], NM: [5, 2], KS: [5, 3], AR: [5, 4], TN: [5, 5], NC: [5, 6], SC: [5, 7], DC: [5, 9],
  OK: [6, 3], LA: [6, 4], MS: [6, 5], AL: [6, 6], GA: [6, 7],
  HI: [7, 0], TX: [7, 3], FL: [7, 8],
};

const STYLE = {
  active:    { bg: "var(--navy2)", fg: "#fff",       clickable: true },
  soon:      { bg: "#f0d9a7",      fg: "#5b4a1e",     clickable: false },
  potential: { bg: "#dce7f3",      fg: "#31527a",     clickable: false },
  none:      { bg: "#eef1f4",      fg: "#9aa2ad",     clickable: false },
};

export default function StatePicker({ userId, current = "AR", compact = false }) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState(current);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function choose(code) {
    setErr(""); setBusy(true); setSelected(code);
    const { error } = await supabase.from("profiles").update({ state: code }).eq("user_id", userId);
    setBusy(false);
    if (error) { setErr("Couldn't save your state: " + error.message); return; }
    setSaved(true); router.refresh();
  }

  const cfg = isSupportedState(selected) ? getStateConfig(selected) : null;

  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: 4,
        maxWidth: 560, margin: "0 auto",
      }}>
        {STATE_META.map(s => {
          const cell = GRID[s.code]; if (!cell) return null;
          const st = STYLE[s.status] || STYLE.none;
          const isSel = selected === s.code;
          return (
            <button
              key={s.code}
              type="button"
              disabled={!st.clickable || busy}
              title={`${s.name} — ${STATUS_LABEL[s.status]}`}
              onClick={() => st.clickable && choose(s.code)}
              style={{
                gridRow: cell[0] + 1, gridColumn: cell[1] + 1,
                aspectRatio: "1 / 1", padding: 0, borderRadius: 7,
                background: st.bg, color: st.fg,
                border: isSel ? "2px solid var(--gold)" : "1px solid #ffffff00",
                boxShadow: isSel ? "0 0 0 2px var(--gold)" : "none",
                fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700,
                cursor: st.clickable ? "pointer" : "default",
                opacity: st.clickable || isSel ? 1 : 0.9,
              }}>
              {s.code}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="sans" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
        {[["active", "Available now"], ["soon", "Coming soon"], ["potential", "Has an ESA — on our radar"], ["none", "No program yet"]].map(([k, label]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: STYLE[k].bg, display: "inline-block", border: "1px solid #0000000f" }} />
            {label}
          </span>
        ))}
      </div>

      {!compact && (
        <p className="sans" style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
          {saved
            ? <span style={{ color: "var(--teal)" }}>✓ Set to <b>{cfg ? `${cfg.name} — ${cfg.program}` : selected}</b>. You can change this later in Settings.</span>
            : cfg
              ? <>Selected: <b>{cfg.name} — {cfg.program}</b>. Tap your state to confirm.</>
              : <>Tap Arkansas or Arizona to choose your program.</>}
        </p>
      )}
      {err && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center" }}>{err}</p>}
    </div>
  );
}

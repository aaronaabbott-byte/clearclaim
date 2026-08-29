"use client";
import { CATEGORIES, categoryCap } from "@/lib/rules";
import { addCapEntry, deleteCapEntry } from "./actions";

// Categories that have a cap — the only ones worth logging here.
const CAPPED = CATEGORIES.filter(c => categoryCap(c));
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const shortCap = (c) => (categoryCap(c) || {}).label || c;

// Per-student logger for approved/marketplace spend that never became a claim.
// `bare` drops the outer box and repeated name so it can nest under a per-student
// card that already shows the name.
export default function CapLogger({ kid, entries = [], bare = false }) {
  const inner = (
    <>
      {!bare && <div className="sans" style={{ fontWeight: 700, fontSize: 14 }}>{kid.first_name}</div>}
      <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 2 }}>Track marketplace / approved spend</div>
      <p className="finenote" style={{ marginTop: 2, marginBottom: 10 }}>
        Log an approved ClassWallet Marketplace or other order here so it counts toward the caps, even without a full claim.
        Enter the <b>base price</b> (before tax &amp; shipping).
      </p>

      {entries.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          {entries.map(e => (
            <div key={e.id} className="sans" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <b>{e.label || "Logged order"}</b>
                <span className="muted"> · {shortCap(e.category)}{e.entry_date ? ` · ${e.entry_date}` : ""}</span>
              </div>
              <span style={{ fontWeight: 700 }}>{money(e.amount)}</span>
              <form action={deleteCapEntry}>
                <input type="hidden" name="id" value={e.id} />
                <button style={{ color: "var(--red)", borderColor: "#e3b7b3", padding: "2px 8px", fontSize: 12 }}>Remove</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={addCapEntry}>
        <input type="hidden" name="kid_id" value={kid.id} />
        <div className="row">
          <div><label>Category</label>
            <select name="category" defaultValue={CAPPED[0]}>
              {CAPPED.map(c => <option key={c} value={c}>{shortCap(c)}</option>)}
            </select>
          </div>
          <div><label>Base price</label><input name="amount" inputMode="decimal" required placeholder="e.g. 799.00" /></div>
          <div><label>Date (optional)</label><input type="date" name="entry_date" /></div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>What was it? (optional)</label>
          <input name="label" placeholder="e.g. Laptop — Best Buy (marketplace, approved)" />
        </div>
        <button className="primary" style={{ marginTop: 10 }}>Add to tracking</button>
      </form>
    </>
  );
  if (bare) return inner;
  return <div className="kid" style={{ display: "block", padding: "14px 16px" }}>{inner}</div>;
}

"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { reorderKids } from "./actions";

// Compact reorder list for the Manage Students page. Supports drag-and-drop
// (desktop) and up/down arrows (works everywhere, including touch). Saves the
// new order as soon as it changes, so nobody has to retype a student to move it.
export default function StudentReorder({ kids }) {
  const router = useRouter();
  const [items, setItems] = useState(kids);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const saveTimer = useRef(null);

  function persist(next) {
    setItems(next);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await reorderKids(next.map(k => k.id));
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  }

  function move(from, to) {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  function onDrop(to) {
    if (dragIndex === null || dragIndex === to) { setDragIndex(null); return; }
    move(dragIndex, to);
    setDragIndex(null);
  }

  if (items.length < 2) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="sans" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Order</span>
        <span className="muted" style={{ fontSize: 12.5 }}>Drag a row, or use the arrows. Saves automatically.</span>
        <span style={{ flex: 1 }} />
        {saved && <span style={{ fontSize: 12.5, color: "var(--teal)", fontWeight: 700 }}>✓ Saved</span>}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((k, i) => (
          <div
            key={k.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onDragEnd={() => setDragIndex(null)}
            className="sans"
            style={{
              display: "grid", gridTemplateColumns: "auto 24px 1fr auto auto", gap: 10, alignItems: "center",
              border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px",
              background: dragIndex === i ? "#eef4fb" : "#fff", cursor: "grab",
            }}
          >
            <span aria-hidden="true" title="Drag to reorder" style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1, userSelect: "none" }}>⠿</span>
            <span className="muted" style={{ fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {k.first_name}{k.grade ? <span className="muted" style={{ fontWeight: 400 }}> · grade {k.grade}</span> : null}
            </span>
            <button type="button" aria-label={`Move ${k.first_name} up`} disabled={i === 0}
              onClick={() => move(i, i - 1)}
              style={{ padding: "2px 9px", opacity: i === 0 ? 0.35 : 1 }}>↑</button>
            <button type="button" aria-label={`Move ${k.first_name} down`} disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
              style={{ padding: "2px 9px", opacity: i === items.length - 1 ? 0.35 : 1 }}>↓</button>
          </div>
        ))}
      </div>
    </div>
  );
}

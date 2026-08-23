"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Saved products/services menu. Add the things you charge for once, then drop
// them into any invoice without retyping.
export default function ItemsEditor({ userId, initial }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState(initial || []);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    setErr("");
    if (!name.trim()) { setErr("Give the item a name."); return; }
    setBusy(true);
    const row = { user_id: userId, name: name.trim(), unit_price: price ? Number(price) : 0 };
    const { data, error } = await supabase.from("provider_items").insert(row).select("*").single();
    setBusy(false);
    if (error) { setErr("Could not save: " + error.message); return; }
    setItems(list => [...list, data]);
    setName(""); setPrice("");
    router.refresh();
  }

  async function del(id) {
    setItems(list => list.filter(i => i.id !== id));
    await supabase.from("provider_items").delete().eq("id", id);
    router.refresh();
  }

  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  return (
    <div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 2 }}><label>Product or service</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 1-hour reading tutoring" /></div>
        <div><label>Price</label><input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="e.g. 45" /></div>
        <button className="primary" disabled={busy} onClick={add} style={{ minWidth: 90 }}>{busy ? "…" : "+ Add"}</button>
      </div>
      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}

      {items.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {items.map(i => (
            <div key={i.id} className="kid" style={{ alignItems: "center", padding: "10px 14px" }}>
              <div style={{ flex: 1 }}><b className="sans" style={{ fontSize: 14 }}>{i.name}</b></div>
              <span className="sans" style={{ fontSize: 14, fontWeight: 700, color: "var(--navy2)" }}>{money(i.unit_price)}</span>
              <button type="button" className="sans" style={{ fontSize: 12, color: "var(--red)", borderColor: "#e3b7b3", marginLeft: 10 }} onClick={() => del(i.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

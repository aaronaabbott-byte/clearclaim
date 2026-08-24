"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/rules";

const STATUSES = [
  ["unfiled", "Not filed yet"],
  ["claimed", "In a claim"],
  ["submitted", "Submitted"],
  ["approved", "Approved"],
  ["denied", "Denied"],
];
const STATUS_COLOR = { unfiled: "var(--muted)", claimed: "var(--gold)", submitted: "var(--navy2)", approved: "var(--teal)", denied: "var(--red)" };
const money = (n) => (n || n === 0) ? `$${Number(n).toFixed(2)}` : "";
const FREE_RECEIPTS = 10;

// Shrink big phone photos before upload — saves storage and download costs, and
// keeps uploads fast. PDFs and already-small files pass through untouched.
async function compressImage(file, maxDim = 1500, quality = 0.82) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale >= 1 && file.size < 800 * 1024) { URL.revokeObjectURL(img.src); return file; }
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, "image/jpeg", quality));
    URL.revokeObjectURL(img.src);
    return (blob && blob.size < file.size) ? blob : file;
  } catch { return file; }
}

export default function ReceiptVault({ userId, kids, initialReceipts, premium = false }) {
  const router = useRouter();
  const supabase = createClient();
  const [receipts, setReceipts] = useState(initialReceipts || []);

  const [file, setFile] = useState(null);
  const [sel, setSel] = useState(kids[0] ? [kids[0].id] : []);
  const toggleSel = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [atCap, setAtCap] = useState(false);

  async function add() {
    setErr(""); setMsg("");
    if (!file) { setErr("Choose a receipt file first."); return; }
    if (sel.length === 0) { setErr("Pick at least one student."); return; }
    if (!premium && receipts.length >= FREE_RECEIPTS) { setAtCap(true); return; }
    setBusy(true);
    try {
      const toUpload = await compressImage(file);
      const path = `${userId}/receipts/${Date.now()}-${file.name}`.replace(/\s+/g, "_");
      const { error: upErr } = await supabase.storage.from("documents").upload(path, toUpload, { upsert: false });
      if (upErr) { setErr("Upload failed: " + upErr.message); setBusy(false); return; }
      const row = {
        user_id: userId, kid_id: sel.length === 1 ? sel[0] : null, kid_ids: sel, shared: sel.length > 1,
        vendor: vendor || null, category: category || null,
        receipt_date: date || null, amount: amount ? Number(amount) : null,
        note: note || null, path, filename: file.name, status: "unfiled",
      };
      const { data, error } = await supabase.from("receipts").insert(row).select("*").single();
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setReceipts(r => [data, ...r]);
      setFile(null); setVendor(""); setAmount(""); setCategory(""); setDate(""); setNote("");
      setMsg("Receipt filed.");
      router.refresh();
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  async function setStatus(id, status) {
    setReceipts(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    await supabase.from("receipts").update({ status }).eq("id", id);
  }

  async function del(r) {
    setReceipts(rs => rs.filter(x => x.id !== r.id));
    if (r.path) await supabase.storage.from("documents").remove([r.path]);
    await supabase.from("receipts").delete().eq("id", r.id);
    router.refresh();
  }

  async function open(r) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(r.path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function useInClaim(r) {
    const p = new URLSearchParams();
    if (r.kid_id) p.set("kid", r.kid_id);
    if (r.vendor) p.set("vendor", r.vendor);
    if (r.amount) p.set("amount", String(r.amount));
    if (r.category) p.set("category", r.category);
    router.push(`/dashboard/claims/new?${p.toString()}`);
  }

  // A receipt is tagged to a student via kid_ids (new) or kid_id (single/legacy),
  // so a shared receipt shows under each student it covers.
  const tagged = (r, id) => (Array.isArray(r.kid_ids) && r.kid_ids.includes(id)) || r.kid_id === id;
  const sharedNames = (r) => kids.filter(k => tagged(r, k.id)).map(k => k.first_name).join(", ");
  const groups = [
    ...kids.map(k => ({ id: k.id, label: `${k.first_name}${k.grade ? ` · grade ${k.grade}` : ""}`, rows: receipts.filter(r => tagged(r, k.id)) })),
    { id: "shared", label: "No student set", rows: receipts.filter(r => !r.kid_id && (!Array.isArray(r.kid_ids) || r.kid_ids.length === 0)) },
  ].filter(g => g.rows.length > 0);

  return (
    <>
      <div className="card">
        <h2>Add a receipt</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Drop receipts in as you go — even before you're ready to file a claim. Tag each to a student so everything stays sorted.
        </p>
        {!premium && (
          <p className="finenote" style={{ marginTop: 4 }}>
            Free plan: {Math.min(receipts.length, FREE_RECEIPTS)} of {FREE_RECEIPTS} receipts used. <a href="/upgrade" style={{ color: "var(--navy2)", fontWeight: 700 }}>Upgrade</a> for an unlimited vault.
          </p>
        )}
        {atCap && (
          <div style={{ marginTop: 10, border: "1px solid #e7d3a6", borderRadius: 12, padding: "11px 14px", background: "#fdf7e8" }}>
            <div className="sans" style={{ fontSize: 13.5, color: "#4a4636" }}>
              <b>You've filled your free vault ({FREE_RECEIPTS} receipts).</b> Upgrade to the Family plan for unlimited receipts and AI. <a href="/upgrade" style={{ color: "var(--navy2)", fontWeight: 700 }}>See plans →</a>
            </div>
          </div>
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Receipt file (photo, screenshot, or PDF)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div><label>Student(s) — pick one, or several for a shared receipt</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {kids.map(k => {
                const on = sel.includes(k.id);
                return (
                  <button type="button" key={k.id} onClick={() => toggleSel(k.id)} className="sans"
                    style={{ fontSize: 13, padding: "8px 13px", fontWeight: 600,
                      background: on ? "var(--navy2)" : "#fff", color: on ? "#fff" : "var(--ink)",
                      borderColor: on ? "var(--navy2)" : "var(--line)" }}>
                    {on ? "✓ " : ""}{k.first_name}
                  </button>
                );
              })}
            </div>
            {sel.length > 1 && <div className="muted sans" style={{ fontSize: 12, marginTop: 5 }}>Shared across {sel.length} students — it'll show under each.</div>}
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>Store / vendor</label><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Amazon" /></div>
          <div><label>Amount</label><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 42.10" /></div>
          <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Choose one…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Latin workbook + markers" /></div>
        </div>
        {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
        <button className="primary" disabled={busy} onClick={add} style={{ marginTop: 12 }}>{busy ? "Filing…" : "File this receipt"}</button>
      </div>

      {groups.length === 0
        ? <div className="card"><p className="muted sans" style={{ fontSize: 14 }}>No receipts yet. Add your first above — they'll sort themselves by student here.</p></div>
        : groups.map(g => (
          <div className="card" key={g.id}>
            <h2 style={{ margin: 0 }}>{g.label} <span className="muted sans" style={{ fontSize: 13, fontWeight: 400 }}>· {g.rows.length}</span></h2>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {g.rows.map(r => (
                <div key={r.id} className="kid" style={{ display: "block", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <b className="sans" style={{ fontSize: 14 }}>{r.vendor || r.filename || "Receipt"}</b>
                      {r.amount ? <span className="sans" style={{ fontSize: 14 }}> · {money(r.amount)}</span> : null}
                      <div className="muted sans" style={{ fontSize: 12.5 }}>
                        {(Array.isArray(r.kid_ids) && r.kid_ids.length > 1) ? <span style={{ color: "var(--gold)", fontWeight: 700 }}>Shared: {sharedNames(r)} · </span> : null}
                        {[r.receipt_date, r.category, r.note].filter(Boolean).join(" · ") || r.filename}
                      </div>
                    </div>
                    <select value={r.status || "unfiled"} onChange={e => setStatus(r.id, e.target.value)}
                      className="sans" style={{ width: "auto", fontSize: 12.5, fontWeight: 700, color: STATUS_COLOR[r.status || "unfiled"], padding: "6px 8px" }}>
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => open(r)}>View</button>
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => useInClaim(r)}>Use in a claim →</button>
                    <button type="button" className="sans" style={{ fontSize: 12.5, color: "var(--red)", borderColor: "#e3b7b3", marginLeft: "auto" }} onClick={() => del(r)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}

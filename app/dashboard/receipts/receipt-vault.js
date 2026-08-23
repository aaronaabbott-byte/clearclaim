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

export default function ReceiptVault({ userId, kids, initialReceipts }) {
  const router = useRouter();
  const supabase = createClient();
  const [receipts, setReceipts] = useState(initialReceipts || []);

  const [file, setFile] = useState(null);
  const [who, setWho] = useState(kids[0]?.id || "shared");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function add() {
    setErr(""); setMsg("");
    if (!file) { setErr("Choose a receipt file first."); return; }
    setBusy(true);
    try {
      const path = `${userId}/receipts/${Date.now()}-${file.name}`.replace(/\s+/g, "_");
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (upErr) { setErr("Upload failed: " + upErr.message); setBusy(false); return; }
      const shared = who === "shared";
      const row = {
        user_id: userId, kid_id: shared ? null : who, shared,
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

  // Group: one section per student, then a Shared / multiple section.
  const groups = [
    ...kids.map(k => ({ id: k.id, label: `${k.first_name}${k.grade ? ` · grade ${k.grade}` : ""}`, rows: receipts.filter(r => r.kid_id === k.id) })),
    { id: "shared", label: "Shared / multiple students", rows: receipts.filter(r => !r.kid_id) },
  ].filter(g => g.rows.length > 0);

  return (
    <>
      <div className="card">
        <h2>Add a receipt</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Drop receipts in as you go — even before you're ready to file a claim. Tag each to a student so everything stays sorted.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Receipt file (photo, screenshot, or PDF)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div><label>Student</label>
            <select value={who} onChange={e => setWho(e.target.value)}>
              {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}{k.grade ? ` (grade ${k.grade})` : ""}</option>)}
              <option value="shared">Shared / multiple students</option>
            </select>
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

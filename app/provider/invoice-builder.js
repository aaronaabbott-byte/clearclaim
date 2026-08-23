"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildInvoicePdf, invoiceTotals, lineTotal } from "@/lib/invoice";

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const blankLine = () => ({ desc: "", qty: 1, unit_price: "" });

export default function InvoiceBuilder({ userId, provider, savedItems = [], existing }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!existing;

  const [invoiceNo, setInvoiceNo] = useState(existing?.invoice_no || "");
  const [student, setStudent] = useState(existing?.student_name || "");
  const [parent, setParent] = useState(existing?.parent_name || "");
  const [date, setDate] = useState(existing?.invoice_date || today());
  const [notes, setNotes] = useState(existing?.notes || "");
  const [shipping, setShipping] = useState(existing?.shipping || "");
  const [tax, setTax] = useState(existing?.tax || "");
  const [lines, setLines] = useState(
    Array.isArray(existing?.items) && existing.items.length ? existing.items : [blankLine()]
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const setLine = (i, k, v) => setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, blankLine()]);
  const removeLine = (i) => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls);
  const addSaved = (it) => setLines(ls => {
    const next = [...ls, { desc: it.name, qty: 1, unit_price: it.unit_price || "" }];
    return ls.length === 1 && !ls[0].desc && !ls[0].unit_price ? next.slice(1) : next;
  });

  function invObject() {
    return {
      invoice_no: invoiceNo || null, student_name: student, parent_name: parent,
      invoice_date: date, items: lines, notes, shipping: Number(shipping) || 0, tax: Number(tax) || 0,
    };
  }
  const totals = invoiceTotals(invObject());

  async function providerForPdf() {
    let logoDataUrl = null;
    if (provider?.logo_path) {
      try {
        const { data } = await supabase.storage.from("documents").download(provider.logo_path);
        if (data) logoDataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(data); });
      } catch { /* skip */ }
    }
    return { ...provider, logoDataUrl };
  }

  async function download() {
    const doc = await buildInvoicePdf({ ...invObject() }, await providerForPdf());
    doc.save(`Invoice-${(invoiceNo || student || date).replace(/\W+/g, "-")}.pdf`);
  }

  async function saveAndDownload() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const row = { user_id: userId, ...invObject(), total: totals.total };
      let error;
      if (editing) ({ error } = await supabase.from("invoices").update(row).eq("id", existing.id));
      else ({ error } = await supabase.from("invoices").insert(row));
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      const doc = await buildInvoicePdf({ ...invObject() }, await providerForPdf());
      doc.save(`Invoice-${(invoiceNo || student || date).replace(/\W+/g, "-")}.pdf`);
      setMsg("Saved and downloaded.");
      router.refresh();
      setTimeout(() => router.push("/provider"), 900);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <div className="card">
      <h2>{editing ? "Edit invoice" : "New invoice"}</h2>
      <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
        Fill in who it's for, add your services, and download a clean invoice on your letterhead — ready to upload to ClassWallet.
      </p>

      <div className="row" style={{ marginTop: 10 }}>
        <div><label>Student name</label><input value={student} onChange={e => setStudent(e.target.value)} placeholder="e.g. Alex Banks" /></div>
        <div><label>Parent / guardian</label><input value={parent} onChange={e => setParent(e.target.value)} placeholder="e.g. Jamie Banks" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Invoice date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>Invoice # (optional)</label><input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. 1001" /></div>
      </div>

      {savedItems.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label>Quick add from your menu</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {savedItems.map(it => (
              <button key={it.id} type="button" className="sans" style={{ fontSize: 13, padding: "7px 12px" }} onClick={() => addSaved(it)}>
                + {it.name}{it.unit_price ? ` (${money(it.unit_price)})` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ margin: 0 }}>Line items</label>
          <span className="spacer" style={{ flex: 1 }} />
          <button type="button" className="sans" style={{ fontSize: 13 }} onClick={addLine}>+ Add line</button>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 80px auto", gap: 8, alignItems: "center" }}>
              <input value={l.desc} onChange={e => setLine(i, "desc", e.target.value)} placeholder="Description" />
              <input value={l.qty} onChange={e => setLine(i, "qty", e.target.value)} inputMode="decimal" placeholder="Qty" />
              <input value={l.unit_price} onChange={e => setLine(i, "unit_price", e.target.value)} inputMode="decimal" placeholder="Unit $" />
              <span className="sans" style={{ fontSize: 13, textAlign: "right", color: "var(--muted)" }}>{money(lineTotal(l))}</span>
              <button type="button" className="sans" style={{ fontSize: 12, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => removeLine(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div><label>Shipping (optional)</label><input value={shipping} onChange={e => setShipping(e.target.value)} inputMode="decimal" placeholder="0.00" /></div>
        <div><label>Tax (optional)</label><input value={tax} onChange={e => setTax(e.target.value)} inputMode="decimal" placeholder="0.00" /></div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Notes (optional)</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Sessions held at the Conway library, Tuesdays in September." />
      </div>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <div className="sans" style={{ fontSize: 13, color: "var(--muted)" }}>Subtotal {money(totals.subtotal)}{shipping ? ` · Shipping ${money(shipping)}` : ""}{tax ? ` · Tax ${money(tax)}` : ""}</div>
        <div className="sans" style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>Total {money(totals.total)}</div>
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button className="primary" disabled={busy} onClick={saveAndDownload}>{busy ? "Working…" : "Save & download PDF"}</button>
        <button type="button" onClick={download}>Download PDF only</button>
        <button type="button" onClick={() => router.push("/provider")} style={{ marginLeft: "auto" }}>Cancel</button>
      </div>
    </div>
  );
}

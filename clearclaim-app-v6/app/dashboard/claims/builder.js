"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PATHWAYS, PATHWAY_FIELDS, CATEGORIES, checkClaim, draftReasoning,
  categoryCap, efaBudgetYear, priorCapSpend } from "@/lib/rules";
import { buildPacketPdfs } from "@/lib/packet";

const DOT = { ok: "var(--teal)", warn: "var(--gold)", fail: "var(--red)" };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default function ClaimBuilder({ kids, userId, claims = [], initialItems = "", initialNote = "" }) {
  const router = useRouter();
  const supabase = createClient();

  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [pathway, setPathway] = useState("reimbursement");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState(initialItems);
  const [purpose, setPurpose] = useState(initialNote);
  const [reasoning, setReasoning] = useState("");
  const [receipts, setReceipts] = useState([]);   // File[]
  const [payments, setPayments] = useState([]);    // File[]
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const kid = kids.find(k => k.id === kidId);
  const fields = PATHWAY_FIELDS[pathway] || {};

  const claim = { vendor, pathway, amount, date, category, items, purpose, reasoning,
    receipt_count: receipts.length, payment_count: payments.length };

  // Running budget for the annual caps (tech $1,000; two separate 25% caps).
  const cap = categoryCap(category, kid?.funding_tier);
  const by = efaBudgetYear(date);
  const prior = cap ? priorCapSpend(claims, kidId, cap.key, by) : 0;
  const amt = Number(amount) || 0;
  const projected = prior + amt;
  const overBy = cap ? projected - cap.amount : 0;

  const checks = useMemo(() => {
    const base = checkClaim(claim);
    if (cap && amt > 0) {
      base.push({
        level: overBy > 0 ? "fail" : (projected > cap.amount * 0.85 ? "warn" : "ok"),
        msg: `${cap.label} budget ${by.label}: ${money(prior)} already claimed + ${money(amt)} = ${money(projected)} of ${money(cap.amount)}`
          + (overBy > 0 ? ` — over by ${money(overBy)}. Needs a documented, pre-approved exception.` : ` (${money(cap.amount - projected)} left).`),
      });
    }
    return base;
  }, [vendor, pathway, amount, date, category, items, purpose, reasoning, receipts.length, payments.length, kidId, prior]);
  const blocking = checks.filter(c => c.level === "fail").length;

  const suggested = useMemo(() => draftReasoning({ ...claim, purpose }, kid),
    [vendor, pathway, items, purpose, kidId]);

  function images() {
    return [
      ...receipts.map(f => ({ kind: "Receipt", blob: f, name: f.name })),
      ...payments.map(f => ({ kind: "Bank charge", blob: f, name: f.name })),
    ];
  }

  async function improveWithAI() {
    setErr(""); setMsg(""); setAiBusy(true);
    try {
      const res = await fetch("/api/reasoning", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: { ...claim, reasoning: reasoning || suggested }, kid }),
      });
      const data = await res.json();
      if (data.text) { setReasoning(data.text); setMsg("Reasoning rewritten with AI."); }
      else {
        setReasoning(data.fallback || suggested);
        setMsg(data.reason === "no-key"
          ? "AI isn't set up yet (no API key) — used a smart draft instead."
          : "AI was unavailable — used a smart draft instead.");
      }
    } catch (e) {
      setReasoning(suggested);
      setMsg("AI was unavailable — used a smart draft instead.");
    }
    setAiBusy(false);
  }

  function packetName(i, total) {
    const base = `ClearClaim-${(vendor || "packet").replace(/\W+/g, "-")}-${date || "draft"}`;
    return total > 1 ? `${base}-file${i + 1}of${total}.pdf` : `${base}.pdf`;
  }

  async function downloadPacket() {
    setErr(""); setMsg("");
    const docs = await buildPacketPdfs({ ...claim, reasoning: reasoning || suggested }, kid, images());
    docs.forEach((d, i) => d.save(packetName(i, docs.length)));
    if (docs.length > 1) setMsg(`Your packet was split into ${docs.length} files so each stays under ClassWallet's page limit. Upload all ${docs.length} to the same submission.`);
  }

  async function saveAndBuild() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!kidId) { setErr("Pick a student."); setBusy(false); return; }
      if (!(+amount > 0)) { setErr("Enter an amount."); setBusy(false); return; }
      if (!category) { setErr("Pick a category."); setBusy(false); return; }

      const finalReasoning = reasoning || suggested;
      const { data: row, error } = await supabase.from("claims").insert({
        user_id: userId, kid_id: kidId, vendor, pathway,
        amount: +amount, date: date || null, category, items,
        purpose, reasoning: finalReasoning,
        status: blocking ? "draft" : "ready",
      }).select("id").single();
      if (error) { setErr("Could not save the claim: " + error.message); setBusy(false); return; }

      // Upload supporting files (best-effort). Failure here shouldn't block the packet.
      const uploaded = [];
      for (const im of images()) {
        const path = `${userId}/${row.id}/${Date.now()}-${im.name}`.replace(/\s+/g, "_");
        const { error: upErr } = await supabase.storage.from("documents").upload(path, im.blob, { upsert: false });
        if (!upErr) uploaded.push({ path, kind: im.kind, name: im.name });
      }
      if (uploaded.length) await supabase.from("claims").update({ files: uploaded }).eq("id", row.id);

      // Build the packet (split into <=5-page files) and download each.
      const docs = await buildPacketPdfs({ ...claim, reasoning: finalReasoning }, kid, images());
      docs.forEach((d, i) => d.save(packetName(i, docs.length)));

      const storeNote = uploaded.length < images().length && images().length > 0
        ? " (files couldn't be stored — check Storage policies — but the packet downloaded fine)"
        : "";
      const splitNote = docs.length > 1
        ? ` Your packet is ${docs.length} files, each under ClassWallet's page limit — upload all ${docs.length} to the same submission.`
        : "";
      setMsg("Saved and packet downloaded." + splitNote + storeNote);
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    }
    setBusy(false);
  }

  if (!kids.length) {
    return <div className="card"><p className="sans">Add a student first, then start a claim.</p></div>;
  }

  return (
    <div className="card">
      <h2>New claim</h2>

      <div className="row">
        <div><label>Student</label>
          <select value={kidId} onChange={e => setKidId(e.target.value)}>
            {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}{k.grade ? ` (grade ${k.grade})` : ""}</option>)}
          </select>
        </div>
        <div><label>Pathway</label>
          <select value={pathway} onChange={e => setPathway(e.target.value)}>
            {PATHWAYS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Store / vendor</label><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Amazon" /></div>
        <div><label>Amount (your portion)</label><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 84.20" /></div>
        {fields.date !== false &&
          <div><label>Date on receipt</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>}
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Choose one…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label>Items (comma-separated)</label><input value={items} onChange={e => setItems(e.target.value)} placeholder="e.g. Latin primer, dry-erase markers" /></div>
      </div>

      {pathway === "reimbursement" && (
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Receipt (photo, screenshot, or PDF)</label>
            <input type="file" accept="image/*,application/pdf" multiple onChange={e => setReceipts([...e.target.files])} />
            <div className="muted sans" style={{ fontSize: 12, marginTop: 4 }}>{receipts.length ? `${receipts.length} file(s)` : "Itemized receipt showing store, date, items, payment method. PDFs and multi-page files are fine — we flatten them for you."}</div>
          </div>
          <div>
            <label>Bank / card charge (photo, screenshot, or PDF)</label>
            <input type="file" accept="image/*,application/pdf" multiple onChange={e => setPayments([...e.target.files])} />
            <div className="muted sans" style={{ fontSize: 12, marginTop: 4 }}>{payments.length ? `${payments.length} file(s)` : "Single transaction showing amount, date, merchant. Required for PayPal."}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <label>Educational-use reasoning</label>
        <textarea rows={3} value={reasoning} onChange={e => setReasoning(e.target.value)}
          placeholder="How this student uses these items in their classes." />
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="sans" onClick={() => setReasoning(suggested)}>Use suggested wording</button>
          <button type="button" className="sans" onClick={improveWithAI} disabled={aiBusy}
            style={{ borderColor: "var(--navy2)", color: "var(--navy2)" }}>
            {aiBusy ? "Thinking…" : "✨ Improve with AI"}
          </button>
          <span className="muted sans" style={{ fontSize: 12.5, flex: 1, minWidth: 180 }}>
            Suggestion: “{suggested.slice(0, 80)}{suggested.length > 80 ? "…" : ""}”
          </span>
        </div>
        <p className="finenote">
          This draft is yours. Give it a read and adjust anything to fit your student before you submit.
          The wording follows published program guidance, and final approval is the reviewer's call.
        </p>
      </div>

      {/* Running budget for capped categories */}
      {cap && (
        <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px",
          background: overBy > 0 ? "#fbeeee" : "#f4f8f6" }}>
          <div className="sans" style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
            <b style={{ color: "var(--navy)" }}>{cap.label}</b>
            <span className="muted">budget year {by.label}</span>
            <span className="spacer" style={{ flex: 1 }} />
            <span style={{ fontWeight: 700, color: overBy > 0 ? "var(--red)" : "var(--teal)" }}>
              {money(projected)} / {money(cap.amount)}
            </span>
          </div>
          <div style={{ height: 10, background: "#e7ecf1", borderRadius: 6, overflow: "hidden", margin: "8px 0 6px" }}>
            <div style={{ width: `${Math.min(100, (prior / cap.amount) * 100)}%`, height: "100%", background: "var(--navy2)", float: "left" }} />
            <div style={{ width: `${Math.min(100 - (prior / cap.amount) * 100, (amt / cap.amount) * 100)}%`, height: "100%",
              background: overBy > 0 ? "var(--red)" : "var(--gold)", float: "left" }} />
          </div>
          <div className="muted sans" style={{ fontSize: 12.5 }}>
            {money(prior)} already claimed for this student this year · this claim {money(amt)}
            {overBy > 0
              ? ` · over the cap by ${money(overBy)} — get a documented exception first.`
              : ` · ${money(cap.amount - projected)} left.`}
          </div>
        </div>
      )}

      {/* Live rules check */}
      <div style={{ marginTop: 16, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "#fbfaf7" }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>
          Pre-submission check {blocking ? `· ${blocking} to fix` : "· looks ready"}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {checks.map((c, i) => (
            <div key={i} className="sans" style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: 8, fontSize: 13 }}>
              <span style={{ color: DOT[c.level], fontWeight: 700 }}>{c.level === "fail" ? "✗" : c.level === "warn" ? "!" : "✓"}</span>
              <span style={{ color: "#3c4048" }}>{c.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="primary" disabled={busy} onClick={saveAndBuild}>
          {busy ? "Working…" : "Save claim & download packet"}
        </button>
        <button type="button" disabled={busy} onClick={downloadPacket}>Download packet only</button>
        <button type="button" onClick={() => router.push("/dashboard")} style={{ marginLeft: "auto" }}>Cancel</button>
      </div>
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PATHWAYS, PATHWAY_FIELDS, CATEGORIES, checkClaim, draftReasoning,
  categoryCap, efaBudgetYear, priorCapSpend, splitEqualCents, buildSplitNote } from "@/lib/rules";
const isTechCategory = (category) => (categoryCap(category) || {}).key === "technology";
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
import { buildPacketPdfs } from "@/lib/packet";

const DOT = { ok: "var(--teal)", warn: "var(--gold)", fail: "var(--red)" };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// File picker that appends (never replaces), offers a phone-camera capture, and
// lists what's attached with a remove control.
function FileField({ files, onAdd, onRemove, hint }) {
  const btn = { fontSize: 13, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", display: "inline-block" };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <label style={btn}>
          + Add file
          <input type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }}
            onChange={e => { onAdd(e.target.files); e.target.value = ""; }} />
        </label>
        <label style={{ ...btn, color: "var(--navy2)", borderColor: "var(--navy2)" }}>
          📷 Take photo
          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={e => { onAdd(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {files.length > 0 ? (
        <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
          {files.map((f, i) => (
            <div key={i} className="sans" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <button type="button" onClick={() => onRemove(i)} style={{ color: "var(--red)", borderColor: "#e3b7b3", padding: "1px 7px", fontSize: 12 }}>Remove</button>
            </div>
          ))}
        </div>
      ) : <div className="muted sans" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function ClaimBuilder({ kids, userId, claims = [], documents = [], initialItems = "", initialNote = "", prefill = {}, premium = false }) {
  const router = useRouter();
  const supabase = createClient();

  const [kidId, setKidId] = useState((prefill.kidId && kids.some(k => k.id === prefill.kidId)) ? prefill.kidId : (kids[0]?.id || ""));
  const [pathway, setPathway] = useState("reimbursement");
  const [vendor, setVendor] = useState(prefill.vendor || "");
  const [amount, setAmount] = useState(prefill.amount || "");
  const [basePrice, setBasePrice] = useState("");   // tech cap counts base price (pre-tax/shipping)
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(prefill.category || "");
  const [items, setItems] = useState(initialItems);
  const [purpose, setPurpose] = useState(initialNote);
  const [reasoning, setReasoning] = useState("");
  const [receipts, setReceipts] = useState([]);   // File[]
  const [payments, setPayments] = useState([]);    // File[]
  const [vaultPicks, setVaultPicks] = useState([]); // document ids to attach
  const [splitOn, setSplitOn] = useState(false);
  const [splitIds, setSplitIds] = useState([]);     // kid ids sharing this receipt
  const [splitMode, setSplitMode] = useState("equal"); // equal | custom
  const [customAmt, setCustomAmt] = useState({});   // { kidId: "12.34" }
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const kid = kids.find(k => k.id === kidId);
  const fields = PATHWAY_FIELDS[pathway] || {};

  // Reported-practice flag (not a 6 CAR Part 35 rule): families say services,
  // tutoring, and Direct Pay tend to want the student's name on the invoice,
  // while parent-name receipts are generally fine for physical supplies.
  const needsStudentName = pathway === "directpay" || /tutor|instructional services|lesson|tuition|therapy/i.test(category || "");

  const techCat = isTechCategory(category);
  const base_price = techCat && Number(basePrice) > 0 ? Number(basePrice) : null;
  const claim = { vendor, pathway, amount, base_price, date, category, items, purpose, reasoning,
    receipt_count: receipts.length, payment_count: payments.length };

  // Running budget for the annual caps (tech $1,000; two separate 25% caps).
  const cap = categoryCap(category, kid?.funding_tier);
  const by = efaBudgetYear(date);
  const prior = cap ? priorCapSpend(claims, kidId, cap.key, by) : 0;
  const amt = Number(amount) || 0;
  // The tech cap counts base price (pre-tax, pre-shipping) when provided.
  const capAmt = techCat && base_price ? base_price : amt;
  const projected = prior + capAmt;
  const overBy = cap ? projected - cap.amount : 0;

  const checks = useMemo(() => {
    const base = checkClaim(claim);
    if (cap && capAmt > 0) {
      base.push({
        level: overBy > 0 ? "fail" : (projected > cap.amount * 0.85 ? "warn" : "ok"),
        msg: `${cap.label} budget ${by.label}: ${money(prior)} already counted + ${money(capAmt)}`
          + (techCat && base_price ? " (base price)" : "")
          + ` = ${money(projected)} of ${money(cap.amount)}`
          + (overBy > 0 ? ` — over by ${money(overBy)}. Needs a documented, pre-approved exception.` : ` (${money(cap.amount - projected)} left).`),
      });
    }
    return base;
  }, [vendor, pathway, amount, basePrice, date, category, items, purpose, reasoning, receipts.length, payments.length, kidId, prior]);
  const blocking = checks.filter(c => c.level === "fail").length;

  const suggested = useMemo(() => draftReasoning({ ...claim, purpose }, kid),
    [vendor, pathway, items, purpose, kidId]);

  function images() {
    return [
      ...receipts.map(f => ({ kind: "Receipt", blob: f, name: f.name })),
      ...payments.map(f => ({ kind: "Bank charge", blob: f, name: f.name })),
    ];
  }

  // Append new files (from the picker or the camera) instead of replacing, and
  // de-dupe on name+size so the same photo isn't added twice.
  function addFiles(setter, list) {
    const incoming = Array.from(list || []);
    setter(prev => {
      const seen = new Set(prev.map(f => f.name + ":" + f.size));
      return [...prev, ...incoming.filter(f => !seen.has(f.name + ":" + f.size))];
    });
  }
  const removeAt = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i));

  // Vault: reusable documents for this student (or family-wide, kid_id null).
  const vaultDocs = documents.filter(d => !d.kid_id || d.kid_id === kidId);
  const toggleVault = (id) => setVaultPicks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Download the picked vault docs so they can be flattened into the packet.
  async function vaultImages() {
    const out = [];
    for (const id of vaultPicks) {
      const d = documents.find(x => x.id === id);
      if (!d?.path) continue;
      const { data, error } = await supabase.storage.from("documents").download(d.path);
      if (!error && data) out.push({ kind: d.label || d.kind || "Document", blob: data, name: d.filename || d.label || "document" });
    }
    return out;
  }

  // --- Split reimbursement math ---------------------------------------------
  // The current student is always part of the split.
  const splitKids = Array.from(new Set([kidId, ...splitIds]));
  const totalCents = Math.round((Number(amount) || 0) * 100);
  const splitShares = (() => {
    const list = splitKids.map(id => ({ id, name: kids.find(k => k.id === id)?.first_name || "Student" }));
    if (splitMode === "equal") {
      const cents = splitEqualCents(totalCents, list.length);
      return list.map((k, i) => ({ ...k, cents: cents[i], amount: (cents[i] || 0) / 100 }));
    }
    return list.map(k => {
      const c = Math.round((Number(customAmt[k.id]) || 0) * 100);
      return { ...k, cents: c, amount: c / 100 };
    });
  })();
  const splitSum = splitShares.reduce((s, k) => s + k.cents, 0);
  const splitBalances = splitSum === totalCents;
  const myShare = splitShares.find(s => s.id === kidId);

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

  async function gatherImages() { return [...images(), ...await vaultImages()]; }

  // The claim(s) to produce. One per student when splitting, else just this one.
  function claimVariants() {
    const finalReasoning = reasoning || suggested;
    if (splitOn && splitKids.length > 1) {
      const note = buildSplitNote(Number(amount) || 0, splitShares.map(s => ({ name: s.name, amount: s.amount })), splitMode);
      const grp = uuid();
      return splitShares.map(s => ({
        kid: kids.find(k => k.id === s.id),
        claim: {
          ...claim, kid_id: s.id, amount: s.amount,
          base_price: (techCat && base_price && totalCents) ? Math.round(base_price * (s.cents / totalCents) * 100) / 100 : null,
          reasoning: finalReasoning, purpose, split_group: grp, split_note: note,
        },
      }));
    }
    return [{ kid, claim: { ...claim, kid_id: kidId, amount: +amount, base_price, reasoning: finalReasoning, purpose, split_group: null, split_note: null } }];
  }

  function packetNameFor(kidName, i, total) {
    const base = `ClearClaim-${(vendor || "packet").replace(/\W+/g, "-")}-${kidName || ""}-${date || "draft"}`.replace(/-+/g, "-");
    return total > 1 ? `${base}-file${i + 1}of${total}.pdf` : `${base}.pdf`;
  }

  async function downloadPacket() {
    setErr(""); setMsg("");
    if (splitOn && splitKids.length > 1 && !splitBalances) { setErr("Fix the split so the amounts add up to the receipt total."); return; }
    const allImages = await gatherImages();
    let files = 0;
    for (const v of claimVariants()) {
      const docs = await buildPacketPdfs(v.claim, v.kid, allImages);
      docs.forEach((d, i) => d.save(packetNameFor(v.kid?.first_name, i, docs.length)));
      files += docs.length;
    }
    setMsg(splitOn && splitKids.length > 1
      ? `Built ${splitKids.length} packets — one per student, each showing the split.`
      : (files > 1 ? `Your packet was split into ${files} files so each stays under ClassWallet's page limit. Upload all ${files} to the same submission.` : ""));
  }

  async function saveAndBuild() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!kidId) { setErr("Pick a student."); setBusy(false); return; }
      if (!(+amount > 0)) { setErr("Enter an amount."); setBusy(false); return; }
      if (!category) { setErr("Pick a category."); setBusy(false); return; }
      if (splitOn && splitKids.length > 1 && !splitBalances) { setErr("The split amounts must add up to the receipt total."); setBusy(false); return; }

      const allImages = await gatherImages();
      const variants = claimVariants();
      let totalFiles = 0, storeFail = false;

      for (const v of variants) {
        const { data: row, error } = await supabase.from("claims").insert({
          user_id: userId, kid_id: v.claim.kid_id, vendor, pathway,
          amount: v.claim.amount, base_price: v.claim.base_price, date: date || null, category, items,
          purpose, reasoning: v.claim.reasoning,
          split_group: v.claim.split_group, split_note: v.claim.split_note,
          status: blocking ? "draft" : "ready",
        }).select("id").single();
        if (error) { setErr("Could not save the claim: " + error.message); setBusy(false); return; }

        // Upload supporting files (best-effort) for this student's claim.
        const uploaded = [];
        for (const im of allImages) {
          const path = `${userId}/${row.id}/${Date.now()}-${im.name}`.replace(/\s+/g, "_");
          const { error: upErr } = await supabase.storage.from("documents").upload(path, im.blob, { upsert: false });
          if (!upErr) uploaded.push({ path, kind: im.kind, name: im.name });
        }
        if (uploaded.length) await supabase.from("claims").update({ files: uploaded }).eq("id", row.id);
        if (uploaded.length < allImages.length && allImages.length > 0) storeFail = true;

        const docs = await buildPacketPdfs(v.claim, v.kid, allImages);
        docs.forEach((d, i) => d.save(packetNameFor(v.kid?.first_name, i, docs.length)));
        totalFiles += docs.length;
      }

      const storeNote = storeFail ? " (some files couldn't be stored — check Storage policies — but the packets downloaded fine)" : "";
      const head = variants.length > 1
        ? `Saved ${variants.length} claims (one per student) and downloaded their packets.`
        : "Saved and packet downloaded.";
      const splitNote = variants.length === 1 && totalFiles > 1
        ? ` Your packet is ${totalFiles} files, each under ClassWallet's page limit — upload all ${totalFiles} to the same submission.`
        : "";
      setMsg(head + splitNote + storeNote);
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1400);
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
        <div><label>{pathway === "marketplace" ? "Order total" : pathway === "directpay" ? "Amount billed" : "Amount (your portion)"}</label><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 84.20" /></div>
        {fields.date !== false &&
          <div><label>{pathway === "marketplace" ? "Order date" : "Date on receipt"}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>}
      </div>

      {techCat && (
        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <label>Base price for the tech cap (before tax &amp; shipping)</label>
            <input value={basePrice} onChange={e => setBasePrice(e.target.value)} inputMode="decimal" placeholder="e.g. 799.00" />
            <p className="finenote" style={{ marginTop: 4 }}>
              The $1,000 technology cap counts the item's base price only — not tax or shipping. Leave blank to count the full amount above.
            </p>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Choose one…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label>Items (comma-separated)</label><input value={items} onChange={e => setItems(e.target.value)} placeholder="e.g. Latin primer, dry-erase markers" /></div>
      </div>

      {needsStudentName && (
        <div style={{ marginTop: 12, border: "1px solid #e7d3a6", borderRadius: 12, padding: "11px 14px", background: "#fdf7e8" }}>
          <div className="sans" style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 8, fontSize: 13, alignItems: "start" }}>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>!</span>
            <div style={{ color: "#4a4636", lineHeight: 1.5 }}>
              <b>Put the student's name on this one.</b> For {pathway === "directpay" ? "Direct Pay" : "services and tutoring"}, families
              report the invoice or receipt should show the student's name — enter it in the vendor's <b>"company"</b> field at checkout,
              or ask the provider to add it to the invoice. For physical supplies you buy yourself, a receipt with your name and the
              student's address is generally accepted.
              <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                This reflects what families report, not a rule in 6 CAR Part 35. The Department makes the final call.
              </div>
            </div>
          </div>
        </div>
      )}

      {pathway === "reimbursement" && (
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Receipt (photo, screenshot, or PDF)</label>
            <FileField files={receipts} onAdd={list => addFiles(setReceipts, list)} onRemove={i => removeAt(setReceipts, i)}
              hint="Itemized receipt showing store, date, items, payment method. PDFs and multi-page files are fine — we flatten them for you." />
          </div>
          <div>
            <label>Bank / card charge (photo, screenshot, or PDF)</label>
            <FileField files={payments} onAdd={list => addFiles(setPayments, list)} onRemove={i => removeAt(setPayments, i)}
              hint="Single transaction showing amount, date, merchant. Required for PayPal." />
          </div>
        </div>
      )}

      {/* Attach from your vault: reusable docs (annual pre-approval, diagnosis, etc.) */}
      {vaultDocs.length > 0 && (
        <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
          <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Attach from your vault</div>
          <p className="finenote" style={{ marginTop: 2, marginBottom: 8 }}>
            Add saved documents to this packet — like the annual non-vendor pre-approval you re-attach every month.
            They're flattened into the packet along with your receipt. Manage files in <a href="/dashboard/documents" style={{ color: "var(--navy2)" }}>Documents</a>.
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {vaultDocs.map(d => (
              <label key={d.id} className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={vaultPicks.includes(d.id)} onChange={() => toggleVault(d.id)} style={{ width: 16, height: 16 }} />
                <span><b>{d.label || d.filename || "Document"}</b>{d.kind ? <span className="muted"> · {d.kind}</span> : null}{!d.kid_id ? <span className="muted"> · family</span> : null}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Split reimbursement across funded students */}
      {kids.length > 1 && pathway !== "directpay" && (
        <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
          <label className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13, color: "var(--navy)", cursor: "pointer" }}>
            <input type="checkbox" checked={splitOn} onChange={e => { setSplitOn(e.target.checked); if (e.target.checked && !splitIds.length) setSplitIds([kidId]); }} style={{ width: 16, height: 16 }} />
            Split this receipt across students
          </label>
          <p className="finenote" style={{ marginTop: 4, marginBottom: splitOn ? 10 : 0 }}>
            Required for one-per-family capped items — a gym membership, a household printer, a co-op fee, a shared garden bed.
            Each student gets their own submission showing the math, with the same receipt attached.
          </p>
          {splitOn && (
            <>
              <div className="sans" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>Students sharing this receipt</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                {kids.map(k => {
                  const on = splitKids.includes(k.id);
                  const isCurrent = k.id === kidId;
                  return (
                    <label key={k.id} className="sans" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, cursor: isCurrent ? "default" : "pointer", opacity: isCurrent ? 0.7 : 1 }}>
                      <input type="checkbox" checked={on} disabled={isCurrent}
                        onChange={() => setSplitIds(prev => {
                          const base = new Set(prev.length ? prev : [kidId]);
                          on ? base.delete(k.id) : base.add(k.id); base.add(kidId);
                          return Array.from(base);
                        })} style={{ width: 15, height: 15 }} />
                      {k.first_name}{isCurrent ? " (this claim)" : ""}
                    </label>
                  );
                })}
              </div>
              <div className="sans" style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="splitmode" checked={splitMode === "equal"} onChange={() => setSplitMode("equal")} /> Equal split
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="splitmode" checked={splitMode === "custom"} onChange={() => setSplitMode("custom")} /> Custom amounts
                </label>
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {splitShares.map(s => (
                  <div key={s.id} className="sans" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{s.name}</span>
                    {splitMode === "custom"
                      ? <input value={customAmt[s.id] ?? ""} onChange={e => setCustomAmt(p => ({ ...p, [s.id]: e.target.value }))}
                          inputMode="decimal" placeholder="0.00" style={{ width: 100, textAlign: "right" }} />
                      : <span style={{ fontWeight: 700 }}>{money(s.amount)}</span>}
                  </div>
                ))}
              </div>
              <div className="sans" style={{ fontSize: 12.5, marginTop: 8, color: splitBalances ? "var(--teal)" : "var(--red)", fontWeight: 700 }}>
                {splitBalances
                  ? `✓ Splits add up to ${money(amount)}. This claim files ${money(myShare?.amount || 0)} for ${kids.find(k=>k.id===kidId)?.first_name}.`
                  : `Splits total ${money(splitSum / 100)} — must equal the receipt total ${money(amount)}.`}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <label>Educational-use reasoning</label>
        <textarea rows={3} value={reasoning} onChange={e => setReasoning(e.target.value)}
          placeholder="How this student uses these items in their classes." />
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="sans" onClick={() => setReasoning(suggested)}>Use suggested wording</button>
          {premium
            ? <button type="button" className="sans" onClick={improveWithAI} disabled={aiBusy}
                style={{ borderColor: "var(--navy2)", color: "var(--navy2)" }}>
                {aiBusy ? "Thinking…" : "✨ Improve with AI"}
              </button>
            : <a href="/upgrade" className="sans" style={{ display: "inline-block", fontSize: 15, padding: "10px 16px", borderRadius: 11, border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 600 }}>🔒 Improve with AI (Family plan)</a>}
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

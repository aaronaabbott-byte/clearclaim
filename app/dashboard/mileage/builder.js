"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MILEAGE_RATE, mileageTotals, buildMileageSvg } from "@/lib/mileage";
import { buildMileagePdf } from "@/lib/mileage-pdf";
import { categoryCap, efaBudgetYear, priorCapSpend } from "@/lib/rules";

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const DRAFT_KEY = "cc_mileage_draft_v1";
// Trips to classes/tutors/therapy/activities draw the Transportation cap; field
// trips draw the Extracurricular cap (same split the claim rules enforce).
const CAT_TRANSPORT = "Transportation";
const CAT_FIELDTRIP = "Extra-Curricular, Physical Education, and Field Trips";
const blankTrip = () => ({ date: "", startName: "", startAddr: "", endName: "", endAddr: "", roundTrip: false, miles: "" });

// Render an SVG string to a JPEG data URL at a given pixel scale. ClassWallet's
// uploader runs OCR and rejects vector PDFs (the state's Excel export), so we
// rasterize to JPEG — the one format families confirm uploads cleanly.
function svgToJpeg(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/width="(\d+)"\s+height="(\d+)"/);
    const w = m ? +m[1] : 1500, h = m ? +m[2] : 1000;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve({ url: c.toDataURL("image/jpeg", 0.92), w, h });
    };
    img.onerror = () => reject(new Error("render"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

export default function MileageBuilder({ kids = [], claims = [], userId = null }) {
  const router = useRouter();
  const supabase = createClient();
  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [studentName, setStudentName] = useState(
    kids[0] ? [kids[0].first_name, kids[0].last_name].filter(Boolean).join(" ") : "");
  const [tripKind, setTripKind] = useState("transportation"); // or "fieldtrip"
  const [date, setDate] = useState("");
  const [trips, setTrips] = useState([blankTrip()]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [calc, setCalc] = useState({}); // { [tripIndex]: { busy, msg, ok } }
  const loaded = useRef(false);

  const kid = kids.find(k => k.id === kidId) || null;
  // Picking a student fills the name on the form (still editable, e.g. after an import).
  function pickKid(id) {
    setKidId(id);
    const k = kids.find(x => x.id === id);
    if (k) setStudentName([k.first_name, k.last_name].filter(Boolean).join(" "));
  }

  // Restore a draft so a parent can build the log across several sittings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.studentName) setStudentName(d.studentName);
        if (d.date) setDate(d.date);
        if (d.tripKind) setTripKind(d.tripKind);
        if (d.kidId && kids.some(k => k.id === d.kidId)) setKidId(d.kidId);
        if (Array.isArray(d.trips) && d.trips.length) setTrips(d.trips);
      }
    } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ studentName, date, trips, kidId, tripKind })); } catch {}
  }, [studentName, date, trips, kidId, tripKind]);

  const cleanTrips = useMemo(
    () => trips.map(t => ({ ...t, miles: Number(String(t.miles).replace(/[^0-9.]/g, "")) || 0 }))
      .filter(t => t.date || t.startName || t.endName || t.miles),
    [trips]);
  const { totalMiles, total } = mileageTotals(cleanTrips);

  // Live travel-cap tracking for the selected student. Which cap depends on the
  // trip kind: regular travel → Transportation cap; field trips → Extracurricular.
  const category = tripKind === "fieldtrip" ? CAT_FIELDTRIP : CAT_TRANSPORT;
  const cap = kid ? categoryCap(category, kid.funding_tier) : null;
  const by = efaBudgetYear(date);
  const prior = cap ? priorCapSpend(claims, kidId, cap.key, by) : 0;
  const projected = prior + total;
  const overBy = cap ? projected - cap.amount : 0;

  const setTrip = (i, key, val) => setTrips(prev => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  const addRow = () => setTrips(prev => [...prev, blankTrip()]);
  const removeRow = (i) => setTrips(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [blankTrip()]);

  function svg() {
    return buildMileageSvg({ studentName, date, trips: cleanTrips });
  }

  // Look up the driving distance between this trip's two addresses (Google) and
  // fill in the Miles field — doubled when it's a round trip. Always editable.
  async function calcMiles(i) {
    const t = trips[i];
    const start = (t.startAddr || "").trim(), end = (t.endAddr || "").trim();
    if (!start || !end) { setCalc(c => ({ ...c, [i]: { busy: false, msg: "Add both addresses first.", ok: false } })); return; }
    setCalc(c => ({ ...c, [i]: { busy: true, msg: "Looking up the distance…", ok: false } }));
    try {
      const res = await fetch("/api/trip-distance", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      const d = await res.json();
      if (!res.ok) { setCalc(c => ({ ...c, [i]: { busy: false, msg: d.error || "Couldn't look that up — type the miles in.", ok: false } })); return; }
      const oneWay = Number(d.miles) || 0;
      const total = t.roundTrip ? Math.round(oneWay * 2 * 10) / 10 : oneWay;
      setTrip(i, "miles", String(total));
      setCalc(c => ({ ...c, [i]: { busy: false, ok: true,
        msg: t.roundTrip ? `${oneWay} mi each way → ${total} mi round trip. Double-check it looks right.` : `${total} mi driving. Double-check it looks right.` } }));
    } catch {
      setCalc(c => ({ ...c, [i]: { busy: false, msg: "Lookup failed — type the miles in.", ok: false } }));
    }
  }

  const fileBase = () => `Mileage-Log-${(studentName || "student").replace(/\W+/g, "-")}-${date || "draft"}`;

  async function downloadPdf() {
    setErr(""); setMsg("");
    if (!cleanTrips.length) { setErr("Add at least one trip first."); return; }
    setBusy(true);
    try {
      const doc = buildMileagePdf({ studentName, date, trips: cleanTrips });
      doc.save(`${fileBase()}.pdf`);
      setMsg("Downloaded your mileage log as a PDF — upload this to ClassWallet. It's built in the format the uploader accepts (not the state's Excel/PDF export, which it rejects).");
    } catch { setErr("Couldn't build the PDF — try the JPEG option below."); }
    setBusy(false);
  }

  async function downloadJpeg() {
    setErr(""); setMsg("");
    if (!cleanTrips.length) { setErr("Add at least one trip first."); return; }
    setBusy(true);
    try {
      const { url } = await svgToJpeg(svg(), 2);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase()}.jpg`;
      a.click();
      setMsg("Downloaded your mileage log as a JPEG — upload this to ClassWallet the same way you'd attach a receipt photo. (Either the PDF or this JPEG uploads cleanly.)");
    } catch { setErr("Couldn't build the image — try again."); }
    setBusy(false);
  }

  // Save the log as a travel claim so it counts against this student's 25% cap
  // (Transportation, or Extracurricular for field trips) and shows up in Claims —
  // then hand back the upload-ready PDF.
  async function saveAndDownload() {
    setErr(""); setMsg("");
    if (!userId) { setErr("Please sign in again to save."); return; }
    if (!kidId) { setErr("Pick a student so this counts toward their travel cap."); return; }
    if (!cleanTrips.length) { setErr("Add at least one trip first."); return; }
    setBusy(true);
    try {
      const dests = Array.from(new Set(cleanTrips.map(t => t.endName).filter(Boolean))).slice(0, 6).join(", ");
      const items = `Mileage log: ${cleanTrips.length} trip${cleanTrips.length === 1 ? "" : "s"}, ${totalMiles} miles @ ${money(MILEAGE_RATE)}/mile${dests ? ` (to ${dests})` : ""}`;
      const purpose = tripKind === "fieldtrip"
        ? "Travel to educational field trips."
        : "Travel to and from this student's approved classes, tutoring, therapy, or activities.";
      const { error } = await supabase.from("claims").insert({
        user_id: userId, kid_id: kidId, vendor: "Mileage", pathway: "reimbursement",
        amount: Math.round(total * 100) / 100, date: date || new Date().toISOString().slice(0, 10),
        category, items, purpose,
        reasoning: purpose, status: "ready",
        miles: totalMiles, mileage_trips: cleanTrips,
      });
      if (error) { setErr("Couldn't save the claim: " + error.message); setBusy(false); return; }
      // Hand back the upload-ready PDF too.
      try { buildMileagePdf({ studentName, date, trips: cleanTrips }).save(`${fileBase()}.pdf`); } catch {}
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setMsg("Saved to this student's claims (it now counts toward their travel cap) and downloaded the PDF to upload to ClassWallet.");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1600);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  async function importSheet(file) {
    if (!file) return;
    setErr(""); setMsg(""); setImportBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = ""; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const res = await fetch("/api/parse-mileage", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileBase64: b64 }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Couldn't read that sheet."); setImportBusy(false); return; }
      if (d.studentName) setStudentName(d.studentName);
      if (d.date) setDate(d.date);
      if (Array.isArray(d.trips) && d.trips.length) {
        setTrips(d.trips.map(t => ({ ...blankTrip(), ...t, miles: t.miles != null ? String(t.miles) : "" })));
        setMsg(`Imported ${d.trips.length} trip${d.trips.length > 1 ? "s" : ""} from your sheet — review them, then download the upload-ready version below.`);
      } else {
        setErr("That sheet didn't have any trips I could read.");
      }
    } catch { setErr("Couldn't read that file — enter the trips by hand."); }
    setImportBusy(false);
  }

  function clearAll() {
    if (!window.confirm("Clear this mileage log and start over?")) return;
    setStudentName(kid ? [kid.first_name, kid.last_name].filter(Boolean).join(" ") : "");
    setDate(""); setTrips([blankTrip()]); setMsg(""); setErr("");
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  const fl = { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 3 };
  const inp = { width: "100%", boxSizing: "border-box" };

  return (
    <div className="card">
      <h2>Mileage log</h2>
      <p className="finenote" style={{ marginTop: -6, marginBottom: 12, background: "#f4f7fb", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px" }}>
        Track your EFA travel here and export an upload-ready file for ClassWallet. Enter each trip's start and end address and
        tap <b>Calculate miles</b> to look up the driving distance — or type it yourself. The state's Excel sheet (and PDF versions
        of it) fail the uploader; this builds the same form as a <b>PDF or JPEG that ClassWallet accepts</b>, getting around the error.
        Reimbursed at <b>{money(MILEAGE_RATE)}/mile</b>. Your log saves on this device as you go.
      </p>

      {/* Import the state's filled-out sheet */}
      <div style={{ border: "1px dashed var(--navy2)", borderRadius: 12, padding: "11px 14px", marginBottom: 14, background: "#f7faf8" }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Already filled out the state's sheet?</div>
        <p className="finenote" style={{ marginTop: 3, marginBottom: 8 }}>
          Upload the state's <b>Travel Reimbursement Request Form</b> (.xlsx) and we'll pull your trips in, then give you the
          upload-ready image version. Nothing is stored — the file is read once and discarded.
        </p>
        <label className="sans" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--navy2)", color: "var(--navy2)", background: "#fff", cursor: "pointer", display: "inline-block" }}>
          {importBusy ? "Reading…" : "⬆ Import the state's sheet"}
          <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: "none" }}
            disabled={importBusy} onChange={e => { importSheet(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>

      <div className="row">
        <div><label>Student</label>
          {kids.length > 0 ? (
            <select value={kidId} onChange={e => pickKid(e.target.value)}>
              {kids.map(k => <option key={k.id} value={k.id}>{[k.first_name, k.last_name].filter(Boolean).join(" ")}</option>)}
            </select>
          ) : <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Student's full name" />}
          {kids.length > 0
            ? <p className="finenote" style={{ marginTop: 4 }}>Saving this log files it as a travel claim for this student, so it counts toward their 25% travel cap.</p>
            : <p className="finenote" style={{ marginTop: 4 }}>Add a student in Settings to track mileage against their travel cap. You can still build and download the form here.</p>}
        </div>
        <div><label>Date of request</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>What were these trips for?</label>
        <div className="sans" style={{ display: "flex", gap: 18, fontSize: 13, marginTop: 4, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="tripkind" checked={tripKind === "transportation"} onChange={() => setTripKind("transportation")} />
            Classes, tutoring, therapy, or activities <span className="muted">· transportation cap</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" name="tripkind" checked={tripKind === "fieldtrip"} onChange={() => setTripKind("fieldtrip")} />
            Field trips <span className="muted">· extracurricular cap</span>
          </label>
        </div>
      </div>

      {/* One card per trip — fields wrap to the screen width so nothing is cut
          off (families are often on a phone). */}
      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {trips.map((t, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "#fcfcfb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Trip {i + 1}</span>
              <span className="spacer" style={{ flex: 1 }} />
              <label className="sans" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!t.roundTrip} onChange={e => setTrip(i, "roundTrip", e.target.checked)} style={{ width: 16, height: 16 }} />
                Round trip
              </label>
              <button type="button" onClick={() => removeRow(i)} title="Remove trip" style={{ color: "var(--red)", borderColor: "#e3b7b3", padding: "3px 10px", fontSize: 12 }}>Remove</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <div><label style={fl}>Date of trip</label><input type="date" value={t.date} onChange={e => setTrip(i, "date", e.target.value)} style={inp} /></div>
              <div><label style={fl}>Miles (GPS)</label><input value={t.miles} onChange={e => setTrip(i, "miles", e.target.value)} inputMode="decimal" placeholder="0" style={inp} /></div>
              <div><label style={fl}>Start — name</label><input value={t.startName} onChange={e => setTrip(i, "startName", e.target.value)} placeholder="Home" style={inp} /></div>
              <div><label style={fl}>Start — address</label><input value={t.startAddr} onChange={e => setTrip(i, "startAddr", e.target.value)} placeholder="123 Main St" style={inp} /></div>
              <div><label style={fl}>End — name</label><input value={t.endName} onChange={e => setTrip(i, "endName", e.target.value)} placeholder="Co-op" style={inp} /></div>
              <div><label style={fl}>End — address</label><input value={t.endAddr} onChange={e => setTrip(i, "endAddr", e.target.value)} placeholder="456 Oak Ave" style={inp} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="sans" style={{ fontSize: 13, borderColor: "var(--navy2)", color: "var(--navy2)" }}
                disabled={!t.startAddr || !t.endAddr || calc[i]?.busy} onClick={() => calcMiles(i)}>
                {calc[i]?.busy ? "Calculating…" : "📍 Calculate miles from addresses"}
              </button>
              {calc[i]?.msg && (
                <span className="finenote" style={{ color: calc[i]?.ok ? "var(--teal)" : "var(--muted)" }}>{calc[i].msg}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={addRow} className="sans">+ Add trip</button>
        <span className="spacer" style={{ flex: 1 }} />
        <div className="sans" style={{ fontSize: 14 }}>
          <span className="muted">Total miles</span> <b>{totalMiles}</b>
          <span style={{ margin: "0 8px", color: "var(--line)" }}>·</span>
          <span className="muted">Reimbursement</span> <b style={{ color: "var(--navy)" }}>{money(total)}</b>
        </div>
      </div>

      {/* Live travel-cap tracking for the selected student. */}
      {cap && (
        <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px",
          background: overBy > 0 ? "#fbeeee" : "#f4f8f6" }}>
          <div className="sans" style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
            <b style={{ color: "var(--navy)" }}>{cap.label} cap</b>
            <span className="muted">{kid?.first_name} · {by.label}</span>
            <span className="spacer" style={{ flex: 1 }} />
            <span style={{ fontWeight: 700, color: overBy > 0 ? "var(--red)" : "var(--teal)" }}>
              {money(projected)} / {money(cap.amount)}
            </span>
          </div>
          <div style={{ height: 10, background: "#e7ecf1", borderRadius: 6, overflow: "hidden", margin: "8px 0 6px" }}>
            <div style={{ width: `${Math.min(100, (prior / cap.amount) * 100)}%`, height: "100%", background: "var(--navy2)", float: "left" }} />
            <div style={{ width: `${Math.min(Math.max(0, 100 - (prior / cap.amount) * 100), (total / cap.amount) * 100)}%`, height: "100%",
              background: overBy > 0 ? "var(--red)" : "var(--gold)", float: "left" }} />
          </div>
          <div className="muted sans" style={{ fontSize: 12.5 }}>
            {money(prior)} already used this year · this log {money(total)}
            {overBy > 0
              ? ` · over the cap by ${money(overBy)} — the Department may deny the overage, so trim trips or split across the year.`
              : ` · ${money(cap.amount - projected)} left.`}
          </div>
        </div>
      )}

      {/* Reminders — the state's four rules, verbatim in spirit. */}
      <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "#fbfaf7" }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>Before you submit — the state's reminders</div>
        <ul className="sans" style={{ fontSize: 12.5, color: "#3c4048", lineHeight: 1.55, margin: 0, paddingLeft: 18 }}>
          <li>Start and end locations must be <b>"Home"</b> or a participating EFA service provider.</li>
          <li>Only trips where the child is in the car count — a return trip without the child doesn't.</li>
          <li>One reimbursement per trip, even if more than one of your kids rode along.</li>
          <li>Travel is capped at <b>25% of the student's annual disbursement</b> per year.</li>
        </ul>
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13.5 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {kidId ? (
          <>
            <button className="primary" disabled={busy} onClick={saveAndDownload}>
              {busy ? "Working…" : "Save to ClearClaim & download PDF"}
            </button>
            <button type="button" disabled={busy} onClick={downloadPdf}>Download PDF only</button>
          </>
        ) : (
          <button className="primary" disabled={busy} onClick={downloadPdf}>
            {busy ? "Building…" : "Download upload-ready PDF"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={downloadJpeg}>Download JPEG</button>
        <button type="button" onClick={clearAll} style={{ marginLeft: "auto", color: "var(--muted)" }}>Clear</button>
      </div>
      <p className="finenote" style={{ marginTop: 10 }}>
        {kidId
          ? "Saving files this as a travel claim for the student (so it counts toward their 25% cap) and downloads the PDF to upload to ClassWallet. Prefer not to save? Use “Download PDF only.” "
          : ""}
        Both the PDF and the JPEG upload cleanly to ClassWallet — attach either the same way you'd attach a receipt.
        ClassWallet rejects the state's own Excel/PDF export with the “imageType” error; the file this tool builds is in a
        format the uploader accepts, which is what gets around it.
      </p>
    </div>
  );
}

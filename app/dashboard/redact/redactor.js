"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Loads pdf.js from a CDN at runtime (webpackIgnore keeps it out of the build).
const PDFJS_VER = "4.4.168";
async function loadPdfjs() {
  const pdfjs = await import(/* webpackIgnore: true */ `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

// Patterns for "suggest a redaction" — a hint layer only, never applied on its own.
const SENSITIVE = [
  /\b\d[\d ]{6,}\d\b/,                 // long digit runs (account / card / routing)
  /\bbalance\b/i,
  /\brouting\b/i,
  /available\s+balance/i,
];

export default function Redactor({ userId }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef(null);
  const viewRef = useRef(null);      // visible canvas
  const basesRef = useRef([]);       // one offscreen base canvas per page
  const [pageBoxes, setPageBoxes] = useState([]); // per page: [{x,y,w,h,on,suggested}]
  const [cur, setCur] = useState(0);
  const [drag, setDrag] = useState(null);
  const [count, setCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [docName, setDocName] = useState("");

  // A friendly default name so naming is optional. Uses today's date, since a
  // standalone redaction has no vendor/student to build from.
  const defaultName = () => `Redacted — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  function redraw() {
    const base = basesRef.current[cur], view = viewRef.current;
    if (!base || !view) return;
    view.width = base.width; view.height = base.height;
    const ctx = view.getContext("2d");
    ctx.drawImage(base, 0, 0);
    const boxes = (pageBoxes[cur] || []);
    const all = drag ? [...boxes, { ...drag, on: true }] : boxes;
    for (const b of all) {
      if (b.on) { ctx.fillStyle = "#000"; ctx.fillRect(b.x, b.y, b.w, b.h); }
      else { ctx.save(); ctx.strokeStyle = "rgba(198,138,28,.95)"; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.restore(); }
    }
  }
  useEffect(redraw);

  async function onFile(e) {
    setErr(""); setMsg(""); setConfirmed(false);
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const bases = [], boxesPerPage = [];
      if (file.type === "application/pdf") {
        const pdfjs = await loadPdfjs();
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const vp = page.getViewport({ scale: 2 });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
          bases.push(c);
          // suggestions from the text layer
          const boxes = [];
          try {
            const tc = await page.getTextContent();
            for (const it of tc.items) {
              if (!it.str || !SENSITIVE.some(re => re.test(it.str))) continue;
              const t = pdfjs.Util.transform(vp.transform, it.transform);
              const fh = Math.hypot(t[2], t[3]);
              const w = (it.width || it.str.length * 5) * 2;
              const x = t[4], y = t[5] - fh;
              boxes.push({ x: x - 2, y: y - 2, w: w + 4, h: fh + 4, on: false, suggested: true });
            }
          } catch {}
          boxesPerPage.push(boxes);
        }
      } else if (file.type.startsWith("image/")) {
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        bases.push(c); boxesPerPage.push([]);
      } else { setErr("Please choose a PDF or image."); setBusy(false); return; }

      basesRef.current = bases;
      setPageBoxes(boxesPerPage);
      setCur(0);
      setCount(boxesPerPage.reduce((s, p) => s + p.filter(b => b.suggested).length, 0));
      requestAnimationFrame(redraw);
    } catch (e2) {
      setErr("Couldn't open that file. For PDFs you need an internet connection to load the viewer. " + (e2.message || ""));
    }
    setBusy(false);
  }

  // Pointer events unify mouse, touch, and pen — the old mouse-only handlers meant
  // phones (which never fire mouse events) couldn't draw a box at all. Pointer
  // capture keeps the drag alive if the finger leaves the canvas; touch-action:none
  // on the canvas stops a drag from scrolling the page instead of drawing.
  function pos(e) { const r = viewRef.current.getBoundingClientRect(); const sx = viewRef.current.width / r.width, sy = viewRef.current.height / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; }
  function down(e) { if (!basesRef.current[cur]) return; e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} const p = pos(e); setDrag({ x: p.x, y: p.y, w: 0, h: 0, _sx: p.x, _sy: p.y }); }
  function move(e) { if (!drag) return; e.preventDefault(); const p = pos(e); setDrag(d => ({ ...d, x: Math.min(d._sx, p.x), y: Math.min(d._sy, p.y), w: Math.abs(p.x - d._sx), h: Math.abs(p.y - d._sy) })); }
  function up() { if (drag && drag.w > 4 && drag.h > 4) setPageBoxes(pb => pb.map((p, i) => i === cur ? [...p, { x: drag.x, y: drag.y, w: drag.w, h: drag.h, on: true }] : p)); setDrag(null); }

  const toggle = (idx) => setPageBoxes(pb => pb.map((p, i) => i === cur ? p.map((b, j) => j === idx ? { ...b, on: !b.on } : b) : p));
  const removeBox = (idx) => setPageBoxes(pb => pb.map((p, i) => i === cur ? p.filter((_, j) => j !== idx) : p));
  const applyAllSuggestions = () => setPageBoxes(pb => pb.map(p => p.map(b => b.suggested ? { ...b, on: true } : b)));

  async function produce() {
    setErr(""); setMsg("");
    if (!confirmed) { setErr("Please confirm you've reviewed every page first."); return; }
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      let doc;
      basesRef.current.forEach((base, i) => {
        // Flatten: paint the approved boxes onto the raster, then export — the
        // covered pixels are overwritten and no text layer exists.
        const out = document.createElement("canvas");
        out.width = base.width; out.height = base.height;
        const ctx = out.getContext("2d");
        ctx.drawImage(base, 0, 0);
        ctx.fillStyle = "#000";
        for (const b of (pageBoxes[i] || [])) if (b.on) ctx.fillRect(b.x, b.y, b.w, b.h);
        const data = out.toDataURL("image/jpeg", 0.92);
        const w = base.width, h = base.height;
        if (i === 0) doc = new jsPDF({ unit: "px", format: [w, h], orientation: w > h ? "landscape" : "portrait" });
        else doc.addPage([w, h], w > h ? "landscape" : "portrait");
        doc.addImage(data, "JPEG", 0, 0, w, h);
      });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `redacted-${Date.now()}.pdf`; a.click();
      URL.revokeObjectURL(url);
      window._lastRedacted = blob;
      setMsg("Redacted PDF downloaded. Give it one more look, then add it to your packet or library.");
    } catch (e) { setErr(e.message || "Couldn't produce the PDF."); }
    setBusy(false);
  }

  async function saveToLibrary() {
    if (!window._lastRedacted) { setErr("Produce the redacted PDF first."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      const path = `${userId}/library/redacted-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, window._lastRedacted, { contentType: "application/pdf" });
      if (upErr) { setErr("Save failed: " + upErr.message); setBusy(false); return; }
      const label = (docName || "").trim() || defaultName();
      await supabase.from("documents").insert({ user_id: userId, label, kind: "redacted", path, filename: path.split("/").pop() });
      setMsg("Saved to your document library."); router.refresh();
    } catch (e) { setErr(e.message || "Couldn't save."); }
    setBusy(false);
  }

  const boxes = pageBoxes[cur] || [];
  const hasPages = basesRef.current.length > 0;

  return (
    <div className="card">
      <h2>Redact a statement or receipt</h2>
      <p className="finenote" style={{ marginTop: 2 }}>
        Redaction runs entirely in your browser and permanently removes the areas you black out from the saved
        file. Automatic suggestions can miss things, so please give every page a final look before you add it to your packet.
      </p>

      <div className="row" style={{ marginTop: 10 }}>
        <div><label>Document (PDF or image)</label>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={onFile} /></div>
      </div>

      {busy && !hasPages && <p className="muted sans" style={{ fontSize: 13 }}>Opening…</p>}

      {hasPages && (
        <>
          <div className="sans" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "14px 0" }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Drag across the page — with a mouse or your finger — to black out a region.</span>
            {count > 0 && <button type="button" onClick={applyAllSuggestions}>Apply all {count} suggestions</button>}
            {basesRef.current.length > 1 && (
              <span className="spacer" style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" disabled={cur === 0} onClick={() => setCur(c => c - 1)}>‹ Prev</button>
                <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>Page {cur + 1} / {basesRef.current.length}</span>
                <button type="button" disabled={cur === basesRef.current.length - 1} onClick={() => setCur(c => c + 1)}>Next ›</button>
              </span>
            )}
          </div>

          <div style={{ overflow: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "#faf9f6" }}>
            <canvas ref={viewRef} onPointerDown={down} onPointerMove={move} onPointerUp={up}
              style={{ display: "block", cursor: "crosshair", maxWidth: "100%", touchAction: "none" }} />
          </div>

          {boxes.length > 0 && (
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {boxes.map((b, j) => (
                <div key={j} className="sans" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    <input type="checkbox" checked={b.on} onChange={() => toggle(j)} style={{ width: 16, height: 16 }} />
                    {b.suggested ? "Suggested redaction" : "Redaction"} on this page
                  </label>
                  <span className="spacer" style={{ flex: 1 }} />
                  <button type="button" onClick={() => removeBox(j)} style={{ color: "var(--red)", borderColor: "#e3b7b3", padding: "4px 10px" }}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <label className="sans" style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 16, fontWeight: 400, color: "var(--ink)", fontSize: 14 }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2 }} />
            I've reviewed every page and the black boxes cover everything I want removed.
          </label>

          <div style={{ marginTop: 14 }}>
            <label>Name for your library (optional)</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder={defaultName()} style={{ maxWidth: 360 }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" className="primary" disabled={busy || !confirmed} onClick={produce}>Produce redacted PDF</button>
            <button type="button" disabled={busy} onClick={saveToLibrary}>Save to library</button>
          </div>
        </>
      )}

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

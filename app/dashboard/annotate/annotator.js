"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Simple canvas annotator: drop labels and highlight boxes on a receipt or
// booklist image, then download or save the flattened result to your library.
export default function Annotator({ userId }) {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const [mode, setMode] = useState("label");     // label | highlight
  const [labelText, setLabelText] = useState("");
  const [annos, setAnnos] = useState([]);         // {type, x, y, w?, h?, text?}
  const [drag, setDrag] = useState(null);         // in-progress rect
  const [hasImg, setHasImg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [docName, setDocName] = useState("");
  const defaultName = () => `Annotated — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  function draw() {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const all = drag ? [...annos, drag] : annos;
    for (const a of all) {
      if (a.type === "rect") {
        ctx.fillStyle = "rgba(255, 214, 0, 0.32)";
        ctx.strokeStyle = "rgba(198,138,28,0.9)"; ctx.lineWidth = 2;
        ctx.fillRect(a.x, a.y, a.w, a.h); ctx.strokeRect(a.x, a.y, a.w, a.h);
      } else if (a.type === "label") {
        ctx.font = "600 16px -apple-system, Segoe UI, Roboto, sans-serif";
        const pad = 5, tw = ctx.measureText(a.text).width;
        ctx.fillStyle = "rgba(22,50,78,0.95)";
        ctx.fillRect(a.x, a.y - 20, tw + pad * 2, 24);
        ctx.fillStyle = "#fff";
        ctx.fillText(a.text, a.x + pad, a.y - 3);
      }
    }
  }
  useEffect(draw); // redraw on every render

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = canvasRef.current;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      imgRef.current = img;
      setAnnos([]); setHasImg(true); setMsg(""); setErr("");
      requestAnimationFrame(draw);
    };
    img.src = URL.createObjectURL(file);
  }

  function pos(e) {
    const c = canvasRef.current, r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height; // canvas may be scaled down on small screens
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  function down(e) {
    if (!hasImg) return;
    e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const p = pos(e);
    if (mode === "label") {
      if (!labelText.trim()) { setErr("Type a label first (e.g. a student's name)."); return; }
      setErr("");
      setAnnos(a => [...a, { type: "label", x: p.x, y: p.y, text: labelText.trim() }]);
    } else {
      setDrag({ type: "rect", x: p.x, y: p.y, w: 0, h: 0, _sx: p.x, _sy: p.y });
    }
  }
  function move(e) {
    if (!drag) return;
    e.preventDefault();
    const p = pos(e);
    setDrag(d => ({ ...d, x: Math.min(d._sx, p.x), y: Math.min(d._sy, p.y), w: Math.abs(p.x - d._sx), h: Math.abs(p.y - d._sy) }));
  }
  function up() {
    if (drag && drag.w > 3 && drag.h > 3) setAnnos(a => [...a, { type: "rect", x: drag.x, y: drag.y, w: drag.w, h: drag.h }]);
    setDrag(null);
  }

  const undo = () => setAnnos(a => a.slice(0, -1));
  const clear = () => setAnnos([]);

  function toBlob() {
    return new Promise(res => canvasRef.current.toBlob(res, "image/png"));
  }
  async function downloadPng() {
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `annotated-${Date.now()}.png`; a.click();
    URL.revokeObjectURL(url);
  }
  async function saveToLibrary() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const blob = await toBlob();
      const path = `${userId}/library/annotated-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, { contentType: "image/png" });
      if (upErr) { setErr("Save failed: " + upErr.message); setBusy(false); return; }
      const { error } = await supabase.from("documents").insert({
        user_id: userId, label: (docName || "").trim() || defaultName(), kind: "annotated", path, filename: path.split("/").pop(),
      });
      if (error) { setErr("Uploaded but couldn't record it: " + error.message); setBusy(false); return; }
      setMsg("Saved to your document library.");
      router.refresh();
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <div className="card">
      <h2>Annotate an image</h2>
      <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
        Upload a receipt or booklist, then label lines (e.g. which student an item is for, “NOT CLAIMED”)
        and highlight sections. Download it or save it to your document library.
      </p>

      <div className="row" style={{ alignItems: "flex-end" }}>
        <div><label>Image</label><input ref={fileRef} type="file" accept="image/*" onChange={onFile} /></div>
      </div>

      {hasImg && (
        <>
          <div className="sans" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "14px 0" }}>
            <div style={{ display: "flex", gap: 4, background: "#eef2f7", padding: 4, borderRadius: 10 }}>
              {[["label", "Label"], ["highlight", "Highlight"]].map(([m, lbl]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  style={{ border: "none", borderRadius: 7, padding: "6px 12px",
                    background: mode === m ? "#fff" : "transparent", fontWeight: mode === m ? 700 : 500,
                    color: mode === m ? "var(--navy)" : "var(--muted)", boxShadow: mode === m ? "var(--sh)" : "none" }}>{lbl}</button>
              ))}
            </div>
            {mode === "label" &&
              <input value={labelText} onChange={e => setLabelText(e.target.value)} placeholder="Label text, e.g. Banks"
                style={{ maxWidth: 220 }} />}
            <span className="muted" style={{ fontSize: 12.5 }}>
              {mode === "label" ? "Click a spot to drop the label." : "Drag to draw a highlight box."}
            </span>
            <span className="spacer" style={{ flex: 1 }} />
            <button type="button" onClick={undo}>Undo</button>
            <button type="button" onClick={clear}>Clear</button>
          </div>

          <div style={{ overflow: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "#faf9f6" }}>
            <canvas ref={canvasRef}
              onPointerDown={down} onPointerMove={move} onPointerUp={up}
              style={{ display: "block", cursor: mode === "label" ? "text" : "crosshair", maxWidth: "100%", touchAction: "none" }} />
          </div>

          <div style={{ marginTop: 14 }}>
            <label>Name for your library (optional)</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder={defaultName()} style={{ maxWidth: 360 }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" className="primary" onClick={downloadPng}>Download PNG</button>
            <button type="button" disabled={busy} onClick={saveToLibrary}>{busy ? "Saving…" : "Save to library"}</button>
          </div>
        </>
      )}

      {!hasImg && <canvas ref={canvasRef} style={{ display: "none" }} />}
      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

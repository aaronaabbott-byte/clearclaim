"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const KINDS = ["booklist", "supply", "preapproval", "diagnosis", "receipt", "annotated", "other"];
const KIND_LABEL = { preapproval: "Pre-approval (annual)", diagnosis: "Medical diagnosis" };

export default function DocumentLibrary({ userId, kids, documents }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("booklist");
  const [kidId, setKidId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");

  const kidName = (id) => kids.find(k => k.id === id)?.first_name;

  function startRename(d) { setEditId(d.id); setEditVal(d.label || d.filename || ""); }
  async function saveRename(id) {
    const name = editVal.trim();
    if (!name) { setEditId(null); return; }
    const { error } = await supabase.from("documents").update({ label: name }).eq("id", id);
    if (error) { setErr("Couldn't rename: " + error.message); return; }
    setEditId(null); router.refresh();
  }

  async function upload(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    const file = fileRef.current?.files?.[0] || camRef.current?.files?.[0];
    if (!file) { setErr("Choose a file or take a photo first."); return; }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/library/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (upErr) { setErr("Upload failed: " + upErr.message + " (check the documents bucket + policies)."); setBusy(false); return; }
      const { error } = await supabase.from("documents").insert({
        user_id: userId, kid_id: kidId || null, label: label || file.name, kind, path, filename: file.name,
      });
      if (error) { setErr("Saved the file but couldn't record it: " + error.message); setBusy(false); return; }
      setLabel(""); if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = "";
      setMsg("Uploaded.");
      router.refresh();
    } catch (e2) { setErr(e2.message || "Something went wrong."); }
    setBusy(false);
  }

  async function download(path) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 120);
    if (error) { setErr("Couldn't open the file: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(id, path) {
    setErr(""); setMsg("");
    await supabase.storage.from("documents").remove([path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { setErr("Couldn't delete: " + error.message); return; }
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h2>Add a document</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Upload booklists, supply lists, enrollment letters, an annual pre-approval, a medical diagnosis, or any supporting proof —
          then attach them to a claim without re-uploading. Files are private to your account, encrypted at rest, and only you can see them.
          Only upload health documents you're comfortable storing, and just what a submission needs.
        </p>
        <form onSubmit={upload}>
          <div className="row">
            <div><label>File</label><input ref={fileRef} type="file" accept="image/*,.heic,.heif,application/pdf" />
              <label className="sans" style={{ display: "inline-block", marginTop: 6, fontSize: 13, padding: "7px 12px", borderRadius: 10, border: "1px solid var(--navy2)", color: "var(--navy2)", cursor: "pointer" }}>
                📷 Take photo instead
                <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={() => { if (fileRef.current) fileRef.current.value = ""; }} />
              </label>
            </div>
            <div><label>Label</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. 5th-grade booklist" /></div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div><label>Type</label>
              <select value={kind} onChange={e => setKind(e.target.value)}>
                {KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k] || (k[0].toUpperCase() + k.slice(1))}</option>)}
              </select>
            </div>
            <div><label>Student (optional)</label>
              <select value={kidId} onChange={e => setKidId(e.target.value)}>
                <option value="">— none / shared</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}</option>)}
              </select>
            </div>
          </div>
          <button className="primary" disabled={busy} style={{ marginTop: 14 }}>{busy ? "Uploading…" : "Upload"}</button>
          {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
          {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
        </form>
      </div>

      <div className="card">
        <h2>Your documents</h2>
        {(!documents || documents.length === 0) ? (
          <p className="muted sans" style={{ fontSize: 14 }}>Nothing uploaded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {documents.map(d => (
              <div className="kid" key={d.id} style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === d.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveRename(d.id); if (e.key === "Escape") setEditId(null); }}
                        style={{ maxWidth: 280 }} />
                      <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => saveRename(d.id)}>Save</button>
                      <button type="button" className="sans" style={{ fontSize: 13 }} onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <b>{d.label || d.filename}</b>
                      <div className="muted sans" style={{ fontSize: 13 }}>
                        {d.kind}{d.kid_id ? ` · ${kidName(d.kid_id) || "student"}` : ""}{d.filename ? ` · ${d.filename}` : ""}
                      </div>
                    </>
                  )}
                </div>
                {editId !== d.id && <button type="button" onClick={() => startRename(d)}>Rename</button>}
                <button type="button" onClick={() => download(d.path)}>Download</button>
                <button type="button" onClick={() => remove(d.id, d.path)} style={{ color: "var(--red)", borderColor: "#e3b7b3" }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const FILE_KINDS = ["Receipt", "Protection plan", "Warranty / serial photo", "Other"];
const money = (n) => (n || n === 0 ? `$${Number(n).toFixed(2)}` : "");

// Coverage badge from the plan end date.
function coverage(planEnd) {
  if (!planEnd) return null;
  const end = new Date(planEnd + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((end - today) / 86400000);
  if (days < 0) return { label: `Plan expired ${planEnd}`, bg: "#fbeeee", bd: "#e3b7b3", fg: "#9a2b25" };
  if (days <= 60) return { label: `Expiring ${planEnd}`, bg: "#fdf7e8", bd: "#e7d3a6", fg: "#8a6d1a" };
  return { label: `Covered until ${planEnd}`, bg: "#eef7f1", bd: "#bfe0cd", fg: "#1f6b45" };
}

const blankForm = () => ({
  name: "", kid_id: "", serial: "", purchase_date: "", purchase_price: "",
  plan_provider: "", plan_cost: "", plan_end: "", plan_contact: "", notes: "",
});

function Fields({ form, set }) {
  return (
    <>
      <div className="row">
        <div><label>Device name<span style={{ color: "#b3261e" }}> *</span></label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Apple iPad 11" /></div>
        <div><label>Serial # (optional)</label><input value={form.serial} onChange={e => set("serial", e.target.value)} placeholder="for warranty claims" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Purchase date</label><input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} /></div>
        <div><label>Purchase price (reference)</label><input value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)} inputMode="decimal" placeholder="e.g. 799.00" /></div>
      </div>
      <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fbfaf7" }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Protection plan (out of pocket — not EFA eligible)</div>
        <div className="row" style={{ marginTop: 6 }}>
          <div><label>Provider</label><input value={form.plan_provider} onChange={e => set("plan_provider", e.target.value)} placeholder="AppleCare, Geek Squad…" /></div>
          <div><label>Plan cost (what you paid)</label><input value={form.plan_cost} onChange={e => set("plan_cost", e.target.value)} inputMode="decimal" placeholder="e.g. 149.00" /></div>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <div><label>Coverage ends</label><input type="date" value={form.plan_end} onChange={e => set("plan_end", e.target.value)} /></div>
          <div><label>Claim phone or link</label><input value={form.plan_contact} onChange={e => set("plan_contact", e.target.value)} placeholder="1-800-… or a URL" /></div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Notes (optional)</label>
        <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. bought at Best Buy Conway; plan covers accidental damage." />
      </div>
    </>
  );
}

export default function DevicesManager({ userId, devices = [], kids = [] }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);     // which device's files panel is open
  const [editId, setEditId] = useState(null);     // which device is being edited
  const [editForm, setEditForm] = useState(blankForm());
  const [kind, setKind] = useState("Receipt");
  const [addKind, setAddKind] = useState("Receipt");
  const fileRef = useRef(null);
  const addFileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const kidName = (id) => kids.find(k => k.id === id)?.first_name;

  const row = (f) => ({
    kid_id: f.kid_id || null, name: f.name.trim(), serial: f.serial || null,
    purchase_date: f.purchase_date || null, purchase_price: f.purchase_price ? Number(f.purchase_price) : null,
    plan_provider: f.plan_provider || null, plan_cost: f.plan_cost ? Number(f.plan_cost) : null,
    plan_end: f.plan_end || null, plan_contact: f.plan_contact || null, notes: f.notes || null,
  });

  async function addDevice(e) {
    e.preventDefault(); setErr(""); setMsg("");
    if (!form.name.trim()) { setErr("Give the device a name."); return; }
    setBusy(true);
    const { data: created, error } = await supabase.from("devices")
      .insert({ user_id: userId, ...row(form) }).select("id").single();
    if (error) { setErr("Couldn't save: " + error.message); setBusy(false); return; }
    // Attach any file chosen right here in the add form (e.g. the purchase receipt).
    const chosen = addFileRef.current?.files;
    if (chosen && chosen.length) {
      const added = [];
      for (const file of Array.from(chosen)) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/devices/${created.id}/${Date.now()}-${safe}`;
        const { error: e2 } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
        if (!e2) added.push({ path, kind: addKind, name: file.name });
      }
      if (added.length) await supabase.from("devices").update({ files: added }).eq("id", created.id);
      if (addFileRef.current) addFileRef.current.value = "";
    }
    setForm(blankForm()); setMsg("Device added."); setBusy(false); router.refresh();
  }

  function startEdit(d) {
    setEditId(d.id);
    setEditForm({
      name: d.name || "", kid_id: d.kid_id || "", serial: d.serial || "",
      purchase_date: d.purchase_date || "", purchase_price: d.purchase_price ?? "",
      plan_provider: d.plan_provider || "", plan_cost: d.plan_cost ?? "",
      plan_end: d.plan_end || "", plan_contact: d.plan_contact || "", notes: d.notes || "",
    });
  }
  async function saveEdit(id) {
    setBusy(true);
    const { error } = await supabase.from("devices").update(row(editForm)).eq("id", id);
    if (error) { setErr("Couldn't save: " + error.message); setBusy(false); return; }
    setEditId(null); setBusy(false); router.refresh();
  }

  async function uploadFiles(d) {
    setErr(""); setMsg("");
    const files = fileRef.current?.files;
    if (!files || !files.length) { setErr("Choose a file first."); return; }
    setBusy(true);
    const existing = Array.isArray(d.files) ? d.files : [];
    const added = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/devices/${d.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (!error) added.push({ path, kind, name: file.name });
    }
    if (added.length) await supabase.from("devices").update({ files: [...existing, ...added] }).eq("id", d.id);
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false); router.refresh();
  }

  async function viewFile(path) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 120);
    if (error) { setErr("Couldn't open the file: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile(d, i) {
    const files = (Array.isArray(d.files) ? d.files : []).slice();
    const [gone] = files.splice(i, 1);
    try { if (gone?.path) await supabase.storage.from("documents").remove([gone.path]); } catch { /* best effort */ }
    await supabase.from("devices").update({ files }).eq("id", d.id);
    router.refresh();
  }

  async function removeDevice(d) {
    if (!window.confirm(`Delete "${d.name}" and its stored files? This can't be undone.`)) return;
    setBusy(true);
    try {
      const paths = (Array.isArray(d.files) ? d.files : []).map(f => f?.path).filter(Boolean);
      if (paths.length) await supabase.storage.from("documents").remove(paths);
    } catch { /* best effort */ }
    await supabase.from("devices").delete().eq("id", d.id);
    setBusy(false); router.refresh();
  }

  return (
    <>
      <div className="card">
        <h2>Devices & protection plans</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Keep the receipt and any protection-plan paperwork right here with the device, so when it breaks months
          later you can actually find what you need to file a repair. Protection plans are paid out of pocket and
          aren't EFA-eligible — this is just a safe place to store the docs. Files are private to your account.
        </p>
        <form onSubmit={addDevice} style={{ marginTop: 10 }}>
          <Fields form={form} set={set} />
          <div className="row" style={{ marginTop: 8 }}>
            <div><label>Student (optional)</label>
              <select value={form.kid_id} onChange={e => set("kid_id", e.target.value)}>
                <option value="">— none / shared</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}</option>)}
              </select>
            </div>
            <div><label>Document type</label>
              <select value={addKind} onChange={e => setAddKind(e.target.value)}>
                {FILE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Attach a document now (optional) — e.g. the purchase receipt</label>
            <input ref={addFileRef} type="file" accept="image/*,.heic,.heif,application/pdf" multiple />
            <p className="finenote" style={{ marginTop: 4 }}>You can add the protection-plan contract and more later from the device's Files panel.</p>
          </div>
          <button className="primary" disabled={busy} style={{ marginTop: 12 }}>{busy ? "Saving…" : "Add device"}</button>
          {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
          {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
        </form>
      </div>

      <div className="card">
        <h2>Your devices</h2>
        {(!devices || devices.length === 0) ? (
          <p className="muted sans" style={{ fontSize: 14 }}>No devices saved yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {devices.map(d => {
              const cov = coverage(d.plan_end);
              const files = Array.isArray(d.files) ? d.files : [];
              const hasReceipt = files.some(f => /receipt/i.test(f.kind || ""));
              const hasPlan = files.some(f => /plan/i.test(f.kind || "")) || d.plan_provider;
              return (
                <div key={d.id} className="kid" style={{ display: "block", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <b>{d.name}</b>
                      {d.kid_id ? <span className="muted sans" style={{ fontSize: 13 }}> · {kidName(d.kid_id) || "student"}</span> : null}
                      <div className="muted sans" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {hasReceipt ? "Receipt ✓" : "No receipt yet"}
                        {d.plan_provider ? ` · ${d.plan_provider}` : ""}
                        {d.plan_cost ? ` · plan ${money(d.plan_cost)} (out of pocket)` : ""}
                      </div>
                    </div>
                    {cov && (
                      <span className="sans" style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: cov.bg, color: cov.fg, border: `1px solid ${cov.bd}` }}>{cov.label}</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                      {openId === d.id ? "Hide files" : `Files (${files.length})`}
                    </button>
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => editId === d.id ? setEditId(null) : startEdit(d)}>
                      {editId === d.id ? "Close edit" : "Edit details"}
                    </button>
                    {d.plan_contact && (
                      <a className="sans" href={/^https?:/i.test(d.plan_contact) ? d.plan_contact : undefined}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: 12.5, padding: "7px 12px", borderRadius: 10, border: "1px solid var(--navy2)", color: "var(--navy2)" }}>
                        File a claim: {d.plan_contact}
                      </a>
                    )}
                    <span style={{ flex: 1 }} />
                    <button type="button" className="sans" disabled={busy} onClick={() => removeDevice(d)}
                      style={{ fontSize: 12.5, color: "var(--red)", borderColor: "#e3b7b3" }}>Delete</button>
                  </div>

                  {editId === d.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <Fields form={editForm} set={setEdit} />
                      <div className="row" style={{ marginTop: 8 }}>
                        <div><label>Student (optional)</label>
                          <select value={editForm.kid_id} onChange={e => setEdit("kid_id", e.target.value)}>
                            <option value="">— none / shared</option>
                            {kids.map(k => <option key={k.id} value={k.id}>{k.first_name}</option>)}
                          </select>
                        </div>
                        <div />
                      </div>
                      <button type="button" className="primary" disabled={busy} style={{ marginTop: 10 }} onClick={() => saveEdit(d.id)}>Save changes</button>
                    </div>
                  )}

                  {openId === d.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      {files.length > 0 ? (
                        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                          {files.map((f, i) => (
                            <div key={i} className="sans" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                              <span style={{ flex: 1, minWidth: 0 }}><b>{f.name || "file"}</b>{f.kind ? <span className="muted"> · {f.kind}</span> : null}</span>
                              <button type="button" className="sans" style={{ fontSize: 12 }} onClick={() => viewFile(f.path)}>View</button>
                              <button type="button" className="sans" style={{ fontSize: 12, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => removeFile(d, i)}>Remove</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="muted sans" style={{ fontSize: 13 }}>No files yet — add the receipt and the protection-plan contract.</p>}
                      <div className="row">
                        <div><label>Document type</label>
                          <select value={kind} onChange={e => setKind(e.target.value)}>
                            {FILE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                        <div><label>File (photo, screenshot, or PDF)</label>
                          <input ref={fileRef} type="file" accept="image/*,.heic,.heif,application/pdf" />
                        </div>
                      </div>
                      <button type="button" className="primary" disabled={busy} style={{ marginTop: 10 }} onClick={() => uploadFiles(d)}>{busy ? "Uploading…" : "Upload"}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

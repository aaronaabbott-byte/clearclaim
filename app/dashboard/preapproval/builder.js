"use client";
import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CRITERIA, COST_NOTE, buildPrefillUrl } from "@/lib/preapproval";
import { detectTech, LIMITATION_CHIPS, PER_DEVICE_REVIEW, CAP_EXCEED, TECH_CAP, TECH_PRIVACY_NOTE } from "@/lib/technology";

const money = (n) => `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function PreapprovalBuilder({ kids, userEmail, documents = [], existing }) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!existing;

  const [parentName, setParentName] = useState(existing?.parent_name || "");
  const [email, setEmail] = useState(existing?.email || userEmail || "");
  const [students, setStudents] = useState(existing?.students || "");
  const [selectedKids, setSelectedKids] = useState([]);
  const [description, setDescription] = useState(existing?.description || "");
  const [cost, setCost] = useState(existing?.cost || "");
  const [justification, setJustification] = useState(existing?.justification || "");
  const [link, setLink] = useState(existing?.link || "");
  const [covered, setCovered] = useState([]);

  // Technology-path fields (only shown when the item is a tech device).
  const [existingGap, setExistingGap] = useState("");
  const [platform, setPlatform] = useState("");
  const [platformSource, setPlatformSource] = useState("");
  const [priorTech, setPriorTech] = useState("");

  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Supporting-document attachments + opt-in shareable links (the ADE form only
  // takes links, not uploads). Signed links are per-file and opt-in.
  const [attachments, setAttachments] = useState(Array.isArray(existing?.files) ? existing.files : []);
  const [atkind, setAtkind] = useState("Curriculum / supply list");
  const [atbusy, setAtbusy] = useState(false);
  const fileRef = useRef(null);
  const LINK_TTL = 60 * 60 * 24 * 182; // ~6 months in seconds

  async function uploadAttachment(e) {
    e?.preventDefault?.();
    const files = fileRef.current?.files;
    if (!files || !files.length) return;
    setAtbusy(true); setErr("");
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const added = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/preapproval/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (!error) added.push({ path, name: file.name, kind: atkind });
    }
    if (fileRef.current) fileRef.current.value = "";
    setAttachments(a => [...a, ...added]);
    setAtbusy(false);
  }
  async function makeLink(i) {
    const a = attachments[i];
    if (!a?.path) return;
    setErr(""); setAtbusy(true);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(a.path, LINK_TTL);
    setAtbusy(false);
    if (error) { setErr("Couldn't make a link: " + error.message); return; }
    setAttachments(list => list.map((x, idx) => idx === i ? { ...x, url: data.signedUrl } : x));
  }
  function addFromVault(d) {
    if (!d?.path) return;
    setAttachments(list => list.some(x => x.path === d.path)
      ? list
      : [...list, { path: d.path, name: d.label || d.filename || "document", kind: d.kind || "Vault document", fromVault: true }]);
  }
  async function removeAttachment(i) {
    const a = attachments[i];
    // Only delete files uploaded here. A vault document is referenced elsewhere —
    // just drop it from this request, don't delete the original.
    if (!a?.fromVault) { try { if (a?.path) await supabase.storage.from("documents").remove([a.path]); } catch { /* best effort */ } }
    setAttachments(list => list.filter((_, idx) => idx !== i));
  }
  function copyText(t) { try { navigator.clipboard.writeText(t); setMsg("Link copied."); } catch { /* ignore */ } }

  const tech = useMemo(() => detectTech(description), [description]);
  const isFurniture = /\b(desk|chair|furniture|bookshelf|book\s*shelf|table|stool)\b/i.test(description);
  const costNum = parseFloat(String(cost).replace(/[^0-9.]/g, "")) || 0;

  function addKid(k) {
    const piece = `${k.first_name}${k.grade ? `, grade ${k.grade}` : ""}`;
    setStudents(s => s ? (s.includes(piece) ? s : `${s}; ${piece}`) : piece);
    setSelectedKids(list => list.find(x => x.id === k.id) ? list : [...list, k]);
    if (k.prior_tech && !priorTech.includes(k.prior_tech)) {
      setPriorTech(p => p ? `${p}; ${k.prior_tech}` : k.prior_tech);
    }
  }

  function addChip(text) {
    setExistingGap(g => g ? (g.includes(text) ? g : `${g}. ${text}`) : text);
  }

  async function generate(extraNote) {
    setErr(""); setMsg(""); setAiBusy(true);
    try {
      const endpoint = tech.isTech ? "/api/tech-justification" : "/api/preapproval-justification";
      const payload = tech.isTech
        ? { description, students, cost, existingGap, platform, platformSource, priorTech, notes: extraNote || "" }
        : { description, students, cost, notes: extraNote || "" };
      const res = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.justification) {
        setJustification(d.justification);
        setCovered(d.covered || []);
        if (!description && d.field5) setDescription(d.field5);
        setMsg(d.source === "ai" ? "Drafted. Review the checklist below, then edit anything."
          : d.source === "no-key" ? "AI isn't set up yet — filled a solid template you can edit." : "Filled a template you can edit.");
      } else setErr("Couldn't draft. Try again.");
    } catch { setErr("Couldn't reach the drafting service."); }
    setAiBusy(false);
  }

  const prefillUrl = buildPrefillUrl({ email, parentName, students, description, cost, justification, link });

  async function saveLog(status) {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!description && !justification) { setErr("Add a description or generate the justification first."); setBusy(false); return; }
      const row = {
        students, description, cost, justification, link, status,
        files: attachments.map(a => ({ path: a.path, name: a.name, kind: a.kind, fromVault: !!a.fromVault })),
        submitted_date: status === "submitted" ? new Date().toISOString().slice(0, 10) : (existing?.submitted_date || null),
      };
      let error;
      if (editing) ({ error } = await supabase.from("preapprovals").update(row).eq("id", existing.id));
      else ({ error } = await supabase.from("preapprovals").insert({ ...row, user_id: (await supabase.auth.getUser()).data.user.id }));
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setMsg(status === "submitted" ? "Logged as submitted." : "Saved to your log.");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <>
      <div className="card">
        <h2>{editing ? "Edit pre-approval request" : "Pre-approval request"}</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: -4 }}>
          Non-core expenses need the Department's approval before you buy, through its Google Form.
          Fill this in, we open the form already filled out, and you review and submit it. ClearClaim never submits for you.
        </p>

        <div className="row">
          <div><label>Parent / guardian name</label><input value={parentName} onChange={e => setParentName(e.target.value)} /></div>
          <div><label>Your email (the form asks twice)</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Student name(s) and grade — one form covers all students sharing this expense</label>
          <textarea rows={2} value={students} onChange={e => setStudents(e.target.value)} placeholder="e.g. Alex, grade 3; Sam, grade 5" />
          {kids.length > 0 &&
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {kids.map(k => <button key={k.id} type="button" className="sans" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addKid(k)}>+ {k.first_name}{k.grade ? ` (grade ${k.grade})` : ""}</button>)}
            </div>}
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Description (keep it short — the form wants "laptop", not a sentence)</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. laptop" /></div>
          <div><label>Anticipated cost (item price)</label><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="e.g. 499" /></div>
        </div>
        <p className="finenote" style={{ marginTop: 6 }}>{COST_NOTE}</p>

        {tech.isExcluded &&
          <p className="finenote" style={{ marginTop: 8, color: "var(--red)" }}>
            Heads up: items like TVs, game consoles, phones, and smart watches are excluded technology categories under the rule, so a pre-approval for this is unlikely to help. Double-check before you spend.
          </p>}

        {(tech.isTech || isFurniture) && (
          <div style={{ marginTop: 10, border: "1px solid #e3b7b3", background: "#fbeeee", borderRadius: 10, padding: "11px 13px" }}>
            <div className="sans" style={{ fontWeight: 800, color: "#9a2b25", fontSize: 13.5 }}>⚠️ List every prior {isFurniture && !tech.isTech ? "furniture" : "technology"} purchase — item, price, and date</div>
            <p className="sans" style={{ fontSize: 13, color: "#4a3a38", marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
              Reviewers do <b>not</b> look up what you've already bought — they only see what you write in this request. If you don't disclose every prior {isFurniture && !tech.isTech ? "furniture" : "technology"} purchase (what it was, how much, and when), your reimbursement can be <b>denied later — even after this pre-approval is granted</b>. Spell them all out below, with prices and dates.
            </p>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label>Why it is necessary (the long field that carries the request)</label>
          <textarea rows={6} value={justification} onChange={e => setJustification(e.target.value)} placeholder="Explain how this supports the student's learning. Or let AI draft it, then edit." />
          <button type="button" className="primary" onClick={() => generate()} disabled={aiBusy} style={{ marginTop: 8 }}>
            {aiBusy ? "Drafting…" : "✨ Draft the justification"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Optional link (item, curriculum, or course description)</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
        </div>

        {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}
      </div>

      {/* Supporting documents + opt-in shareable links (the ADE form takes links, not uploads) */}
      <div className="card">
        <h2 style={{ margin: 0 }}>Supporting documents &amp; links</h2>
        <p className="muted sans" style={{ fontSize: 13.5, marginTop: 6 }}>
          The Department's pre-approval form can't accept file uploads — only links. Upload your supporting documents here
          (a curriculum or supply list, an item page, a therapist/provider note), make a shareable link for each, and paste
          the link into the form's link field. The files also stay here as your record.
        </p>
        <div style={{ border: "1px solid #e7d3a6", background: "#fdf7e8", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
          <p className="sans" style={{ fontSize: 12.5, color: "#4a4636", margin: 0, lineHeight: 1.5 }}>
            <b>Before you make a link:</b> anyone who has the link can open that file — the reviewer's form has no login — and the
            link works for about 6 months. Only make a link for a document you're comfortable sharing with the reviewer, and
            don't link anything you wouldn't put in the request. For a medical or therapist note, share only what the request
            actually needs.
          </p>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Document type</label>
            <select value={atkind} onChange={e => setAtkind(e.target.value)}>
              {["Curriculum / supply list", "Item page / product listing", "Therapist or provider note", "Other"].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div><label>File (photo, screenshot, or PDF)</label>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif,application/pdf" multiple />
          </div>
        </div>
        <button type="button" className="sans" style={{ marginTop: 8 }} disabled={atbusy} onClick={uploadAttachment}>{atbusy ? "Working…" : "Upload"}</button>

        {documents.length > 0 &&
          <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="sans" style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Or pick from your document library</div>
            <p className="finenote" style={{ marginTop: 2, marginBottom: 8 }}>Add a file you already saved in Documents, then make a shareable link for it the same way.</p>
            <div style={{ display: "grid", gap: 6 }}>
              {documents.map(d => {
                const already = attachments.some(x => x.path === d.path);
                return (
                  <div key={d.id} className="sans" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                    <span style={{ flex: 1, minWidth: 0 }}><b>{d.label || d.filename || "Document"}</b>{d.kind ? <span className="muted"> · {d.kind}</span> : null}</span>
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} disabled={already} onClick={() => addFromVault(d)}>{already ? "Added" : "Add"}</button>
                  </div>
                );
              })}
            </div>
          </div>}

        {attachments.length > 0 &&
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {attachments.map((a, i) => (
              <div key={i} className="kid" style={{ display: "block", padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}><b className="sans" style={{ fontSize: 13.5 }}>{a.name}</b>{a.kind ? <span className="muted sans" style={{ fontSize: 12.5 }}> · {a.kind}</span> : null}</div>
                  {!a.url && <button type="button" className="sans" style={{ fontSize: 12.5 }} disabled={atbusy} onClick={() => makeLink(i)}>Get shareable link</button>}
                  <button type="button" className="sans" style={{ fontSize: 12.5, color: "var(--red)", borderColor: "#e3b7b3" }} onClick={() => removeAttachment(i)}>Remove</button>
                </div>
                {a.url &&
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input readOnly value={a.url} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 200, fontSize: 12 }} />
                    <button type="button" className="sans" style={{ fontSize: 12.5 }} onClick={() => copyText(a.url)}>Copy</button>
                    <a className="sans" href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Open</a>
                  </div>}
              </div>
            ))}
            <p className="finenote">Paste these links into the pre-approval form's link field. Links expire in about 6 months — reopen this request to make fresh ones if a reviewer needs them later.</p>
          </div>}
      </div>

      {/* Technology-specific path — shown only for tech devices/accessories */}
      {tech.isTech && !tech.isExcluded &&
        <div className="card" style={{ borderColor: "var(--navy2)", background: "linear-gradient(180deg,#f2f6fb,#fff)" }}>
          <h2 style={{ margin: 0 }}>Technology details</h2>
          <p className="muted sans" style={{ fontSize: 13.5, marginTop: 6 }}>
            Technology gets a closer look than most items: the Department weighs each device on its own need and looks at what you already have, on top of the ${TECH_CAP.toLocaleString()} yearly device limit. A few specifics make the request much stronger.
          </p>

          {/* Running device cap, per selected student */}
          {selectedKids.length > 0 &&
            <div style={{ marginTop: 8, marginBottom: 6 }}>
              {selectedKids.map(k => {
                const used = Number(k.tech_used) || 0;
                const projected = used + costNum;
                const pct = Math.min(100, (projected / TECH_CAP) * 100);
                const over = projected > TECH_CAP;
                const second = used > 0 || (k.prior_tech && k.prior_tech.trim());
                return (
                  <div key={k.id} style={{ marginBottom: 10 }}>
                    <div className="sans" style={{ display: "flex", fontSize: 12.5, marginBottom: 3 }}>
                      <span className="muted">{k.first_name} · device spend this year{costNum ? " (with this request)" : ""}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontWeight: 700, color: over ? "var(--red)" : "var(--muted)" }}>{money(projected)} / {money(TECH_CAP)}</span>
                    </div>
                    <div style={{ height: 8, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: over ? "var(--red)" : "var(--navy2)" }} />
                    </div>
                    {over &&
                      <p className="finenote" style={{ marginTop: 4 }}>{CAP_EXCEED.note}</p>}
                    {second &&
                      <p className="finenote" style={{ marginTop: 4 }}>
                        {k.first_name} already has technology on record this year. {PER_DEVICE_REVIEW.note} <span className="muted">({PER_DEVICE_REVIEW.label})</span>
                      </p>}
                  </div>
                );
              })}
            </div>}

          <div style={{ marginTop: 6 }}>
            <label>What can't the device you already have do for this? Be specific.</label>
            <textarea rows={3} value={existingGap} onChange={e => setExistingGap(e.target.value)}
              placeholder="e.g. a tablet keyboard case isn't a full-size layout, and the typing course needs proper hand positioning on a standard keyboard" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {LIMITATION_CHIPS.map((c, i) => (
                <button key={i} type="button" className="sans" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addChip(c)}>+ {c}</button>
              ))}
            </div>
            <p className="finenote" style={{ marginTop: 6 }}>
              We use only what you write here. If you don't have a current device, leave this blank and the draft will say so plainly instead of guessing.
            </p>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div><label>Required program or platform (optional)</label><input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="e.g. a Windows/Mac typing program" /></div>
            <div><label>Where that requirement comes from (optional)</label><input value={platformSource} onChange={e => setPlatformSource(e.target.value)} placeholder="e.g. the course syllabus" /></div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Technology this student already received through EFA — item, price, and when (list ALL of it)</label>
            <input value={priorTech} onChange={e => setPriorTech(e.target.value)} placeholder="e.g. tablet $280 (Aug 2025); printer $90 (Oct 2025)" />
            <p className="finenote" style={{ marginTop: 4 }}>Prefilled from the student's profile when you pick them above — add the price and date for each. The draft uses this to show the new device isn't a duplicate, and it's what protects you from a "didn't disclose prior purchases" denial later.</p>
          </div>

          <p className="finenote" style={{ marginTop: 10 }}>{TECH_PRIVACY_NOTE}</p>
        </div>}

      {/* Seven-criteria checklist */}
      <div className="card">
        <h2 style={{ margin: 0 }}>Does your explanation cover the full standard?</h2>
        <p className="muted sans" style={{ fontSize: 13.5, marginTop: 6 }}>
          The form only asks for part of what reviewers actually look at. When all seven are covered, you have said enough.
          This is a checklist, not a prediction of approval.
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {CRITERIA.map(c => {
            const on = covered.includes(c.id);
            return (
              <div key={c.id} className="sans" style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "center",
                border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", background: on ? "#f2f8f6" : "#fff" }}>
                <span style={{ color: on ? "var(--teal)" : "var(--muted)", fontWeight: 700 }}>{on ? "✓" : "•"}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{c.name}</b> <span className="muted" style={{ fontSize: 12 }}>· {c.group}</span>
                  <div className="muted" style={{ fontSize: 13 }}>{c.plain}</div>
                </div>
                {!on && justification &&
                  <button type="button" className="sans" style={{ fontSize: 12 }} disabled={aiBusy}
                    onClick={() => generate(`Make sure to clearly address: ${c.name} (${c.plain})`)}>Add this</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Open the form + walkthrough */}
      <div className="card">
        <h2>Open the form, filled in</h2>
        <ol className="sans" style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Open the pre-approval form. Every field is filled from what you entered above.</li>
          <li>Read each field and fix anything.</li>
          <li>Turn on <b>"Send me a copy of my responses"</b> near the bottom. That emailed copy is your only record.</li>
          <li>Click <b>Submit</b> on the form. ClearClaim does not submit it for you.</li>
        </ol>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <a href={prefillUrl} target="_blank" rel="noopener noreferrer"><button className="primary">Open the pre-approval form ↗</button></a>
          <button type="button" disabled={busy} onClick={() => saveLog("draft")}>Save to my log</button>
          <button type="button" disabled={busy} onClick={() => saveLog("submitted")}>I submitted it — log as submitted</button>
        </div>
        <p className="finenote" style={{ marginTop: 12 }}>
          ClearClaim has no connection to the Department and cannot see your request's status. You update the status yourself in your log.
          This is guidance based on published rule text, not a decision. The Department decides, and approval is not guaranteed.
        </p>
      </div>
    </>
  );
}

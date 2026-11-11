"use client";
import { useState } from "react";

// "Family link" button for a provider invoice or course document. Mints a
// clearclaimapp.com/v/<token> link the family can open, print, or save as PDF.
export default function DocShare({ kind, refId }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function make(e) {
    e.preventDefault(); e.stopPropagation();
    if (url) { setOpen(o => !o); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/doc-share", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", kind, refId }),
      });
      const data = await res.json();
      if (res.ok && data.url) { setUrl(data.url); setOpen(true); }
    } catch { /* ignore */ }
    setBusy(false);
  }
  function copy(e) { e.preventDefault(); e.stopPropagation(); try { navigator.clipboard.writeText(url); setCopied(true); } catch { /* ignore */ } }

  return (
    <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button type="button" className="sans" style={{ fontSize: 12 }} disabled={busy} onClick={make}>
        {busy ? "…" : open ? "Hide link" : "Family link"}
      </button>
      {open && url && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input readOnly value={url} onClick={e => { e.preventDefault(); e.stopPropagation(); e.target.select(); }} style={{ width: 190, fontSize: 11 }} />
          <button type="button" className="sans" style={{ fontSize: 11.5 }} onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          <a className="sans" href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }} onClick={e => e.stopPropagation()}>Open</a>
        </span>
      )}
    </span>
  );
}

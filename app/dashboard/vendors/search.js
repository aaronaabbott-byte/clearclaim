"use client";
import { useEffect, useRef, useState } from "react";

const TAG = {
  marketplace: { label: "Marketplace", bg: "#fff6da", fg: "#8a6d1a", bd: "#e9d492" },
  directpay: { label: "Direct Pay", bg: "#eaf2fb", fg: "#274b76", bd: "#c3d6ea" },
};

export default function VendorSearch({ count, updated }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) { setResults([]); setBusy(false); return; }
    setBusy(true); setTouched(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/vendors?q=${encodeURIComponent(term)}`);
        const data = await r.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch { setResults([]); }
      setBusy(false);
    }, 220);
    return () => timer.current && clearTimeout(timer.current);
  }, [q]);

  const term = q.trim();

  return (
    <div className="card">
      <h2 style={{ marginBottom: 4 }}>Find a vendor</h2>
      <p className="muted sans" style={{ fontSize: 14, marginTop: 0 }}>
        Search {count ? count.toLocaleString() : "the"} approved ClassWallet vendors by their business name — or by what people
        actually call them. Each result shows whether they’re in the <b>Marketplace</b> or set up for <b>Direct Pay</b>.
      </p>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. Varsity Tutors, AOP, Painting with a Twist…"
        style={{ fontSize: 16, padding: "12px 14px" }}
      />

      <div style={{ marginTop: 14 }}>
        {term.length < 2 && (
          <p className="muted sans" style={{ fontSize: 13 }}>Type at least two letters to search.</p>
        )}
        {term.length >= 2 && busy && (
          <p className="muted sans" style={{ fontSize: 13, fontStyle: "italic" }}>Searching…</p>
        )}
        {term.length >= 2 && !busy && results.length === 0 && touched && (
          <div className="finenote" style={{ background: "#f4f7fb", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
            No match in the list for “{term}.” The list is refreshed periodically and brand-new vendors may not be in it yet —
            search ClassWallet directly, and try the vendor’s legal business name (it often differs from what they’re “called”).
          </div>
        )}
        {results.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {results.map((v, i) => {
              const t = TAG[v.type] || TAG.directpay;
              return (
                <div key={i} className="kid" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <b>{v.name}</b>
                    {v.aliases && v.aliases.length > 0 && (
                      <div className="muted sans" style={{ fontSize: 13 }}>also called: {v.aliases.join(" · ")}</div>
                    )}
                  </div>
                  <span className="sans" style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}>
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="finenote" style={{ marginTop: 14 }}>
        Vendor list last refreshed {updated || "recently"}. ClearClaim isn’t affiliated with the state or ClassWallet;
        the Department’s system is the final word on who’s an active vendor.
      </p>
    </div>
  );
}

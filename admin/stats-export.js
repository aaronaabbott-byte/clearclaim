"use client";

// Downloads the usage snapshot as a CSV: a metrics summary, then one row per
// account. Runs entirely in the browser (no server round-trip).
export default function StatsExport({ stats, accounts = [] }) {
  const active = (d) => d && String(d) >= new Date().toISOString().slice(0, 10);
  const planOf = (a) => {
    if (active(a.family_until)) return `Family→${a.family_until}`;
    if (a.free_family || (a.state || "AR").toUpperCase() === "AR") return "Family (free AR)";
    if (active(a.provider_until)) return `Provider→${a.provider_until}`;
    return "Free (limited)";
  };
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  function download() {
    const rows = [];
    rows.push(["ClearClaim usage export", new Date().toISOString()]);
    rows.push([]);
    rows.push(["Metric", "Value"]);
    for (const [k, v] of Object.entries(stats)) rows.push([k, v]);
    rows.push([]);
    rows.push(["email", "created_at", "last_sign_in_at", "state", "plan", "students", "claims", "preapprovals", "is_provider"]);
    for (const a of accounts) {
      rows.push([a.email, a.created_at, a.last_sign_in_at, a.state || "", planOf(a), a.kids, a.claims, a.preapprovals, a.is_provider ? "yes" : ""]);
    }
    const csv = rows.map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clearclaim-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="sans" onClick={download} style={{ fontSize: 13 }}>Export CSV</button>
  );
}

"use client";

// Small print/save-as-PDF button for the public shared-document view. Hidden
// when the page is actually printed (via the no-print class).
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print"
      style={{ background: "#16324e", color: "#fff", border: "none", borderRadius: 5, padding: "9px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif" }}>
      Print / Save as PDF
    </button>
  );
}

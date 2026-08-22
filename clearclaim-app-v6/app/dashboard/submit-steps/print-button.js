"use client";
export default function PrintButton() {
  return <button type="button" className="primary" onClick={() => window.print()}>Print these steps</button>;
}

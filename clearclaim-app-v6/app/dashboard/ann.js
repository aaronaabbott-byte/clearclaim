"use client";
import { useEffect, useRef, useState } from "react";

const GREETING = { role: "assistant", content: "Hi, I'm Ann. Ask me anything about EFA reimbursements, ClassWallet, what's eligible, or how to use ClearClaim." };

export default function AskAnn() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, busy]);

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ann", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter(m => m !== GREETING) }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply || "Sorry — I had trouble answering just now. Please try again." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "I couldn't reach the server. Please try again in a moment." }]);
    }
    setBusy(false);
  }

  return (
    <>
      {/* Launcher */}
      <button onClick={() => setOpen(o => !o)} aria-label="Ask Ann"
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 60,
          width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--navy), var(--navy2))", color: "#fff",
          boxShadow: "0 10px 30px rgba(20,30,45,.28)", fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700,
        }}>
        {open ? "✕" : "Ann"}
      </button>

      {open && (
        <div className="sans" style={{
          position: "fixed", right: 20, bottom: 92, zIndex: 60,
          width: "min(380px, calc(100vw - 40px))", height: "min(560px, calc(100vh - 130px))",
          background: "#fff", border: "1px solid var(--line)", borderRadius: 18,
          boxShadow: "0 24px 60px rgba(20,30,45,.28)", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ background: "linear-gradient(120deg, var(--navy), var(--navy2))", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gold)", color: "#3a2a06", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "var(--serif)" }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontFamily: "var(--serif)", fontSize: 17 }}>Ask Ann</div>
              <div style={{ fontSize: 11.5, color: "#cadaee" }}>EFA & ClearClaim help</div>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#f7f9fc" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "82%", padding: "9px 12px", borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
                  background: m.role === "user" ? "var(--navy2)" : "#fff", color: m.role === "user" ? "#fff" : "var(--ink)",
                  border: m.role === "user" ? "none" : "1px solid var(--line)",
                }}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>Ann is typing…</div>}
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about a purchase, a rule, or a step…"
              style={{ flex: 1 }} />
            <button className="primary" disabled={busy || !input.trim()}>Send</button>
          </form>
          <div className="muted" style={{ fontSize: 10.5, textAlign: "center", padding: "0 12px 10px" }}>
            Ann can be wrong and isn't legal or financial advice. Verify against the program.
          </div>
        </div>
      )}
    </>
  );
}

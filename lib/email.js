// Minimal transactional email via Resend's HTTP API — no npm dependency, just
// fetch, so it runs the same on Vercel, Cloudflare, or any Node/Edge runtime.
//
// Config (server-only env):
//   RESEND_API_KEY   secret key from resend.com. If unset, sending is a no-op
//                    that returns { skipped: true } — safe for dev and preview.
//   NOTIFY_FROM      e.g. "ClearClaim <notify@clearclaimapp.com>"
//   NOTIFY_REPLY_TO  optional reply-to address.
//
// Swapping providers later (Postmark, SES) means changing only this file.

const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.NOTIFY_FROM;
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!to || !subject) return { error: "missing to/subject" };
  if (!emailConfigured()) {
    // Don't throw — callers (crons) must keep working without email configured.
    console.log(`[email] skipped (not configured): "${subject}" -> ${to}`);
    return { skipped: true };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo || process.env.NOTIFY_REPLY_TO || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `resend ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = await res.json().catch(() => ({}));
    return { id: data?.id || null };
  } catch (e) {
    return { error: e?.message || "send failed" };
  }
}

// Shared wrapper so every email looks the same and is plain, readable, and
// trustworthy — no tracking pixels, no marketing chrome.
export function wrapHtml(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a44">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6eaf3">
    <div style="background:#15264b;padding:18px 22px"><span style="color:#fff;font-weight:700;font-size:17px;letter-spacing:.2px">ClearClaim</span></div>
    <div style="padding:22px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:14px 22px;border-top:1px solid #eef1f7;color:#8792a8;font-size:12px">
      You're getting this because you use ClearClaim. Manage email reminders in your account settings.
    </div>
  </div></body></html>`;
}

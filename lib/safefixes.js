// The ONLY fixes the health cron is allowed to apply on its own.
//
// Every entry here must be: reversible, non-destructive, and touching nothing
// that matters — no code, no schema, no rule logic, no money, no user content.
// If a fix doesn't clearly meet that bar, it does NOT go here; it waits for
// Aaron's approval and shows up in the digest instead.
//
// Each fix: { name, match(group) -> bool, async apply(admin, group) -> bool }
// `apply` returns true only if it actually did something.

export const SAFE_FIXES = [
  {
    // A notification send failed (transient provider/network blip). It was never
    // logged as sent, so it will simply be retried on the next notifications run.
    // "Fixing" it here just means acknowledging it's self-healing — we don't
    // resend from here (that's the notifications cron's job and it dedupes).
    name: "transient-email-retry",
    match: (g) => /email|resend|smtp|notif/i.test(`${g.source} ${g.sample?.message || ""}`)
                  && /timeout|ETIMEDOUT|ECONNRESET|network|429|503|temporarily/i.test(g.sample?.message || ""),
    apply: async () => true, // no-op: the next scheduled run retries unsent mail
  },
  {
    // Stuck "sending"/"processing" flags left by an interrupted request. Clearing
    // them back to a neutral state is safe and reversible. Only touches an
    // internal status flag, never claim content, amounts, or files.
    name: "clear-stuck-processing-flag",
    match: (g) => /stuck|stale lock|processing flag|already in progress/i.test(g.sample?.message || ""),
    apply: async (admin, g) => {
      // Example of the shape; scoped narrowly and time-bounded so it can't touch
      // anything current. Returns false (no-op) if the optional table is absent.
      try {
        const cutoff = new Date(Date.now() - 30 * 60000).toISOString();
        const { error } = await admin
          .from("job_locks").update({ status: "idle" })
          .eq("status", "processing").lt("locked_at", cutoff);
        return !error;
      } catch { return false; }
    },
  },
];

// Deliberately NOT auto-fixed (always wait for approval): anything that changes
// code or schema, edits or deletes a user's claims/receipts/documents, alters
// rule logic or caps, moves money, sends bulk mail, or that we can't cleanly
// undo. These surface in the health digest for Aaron to decide.

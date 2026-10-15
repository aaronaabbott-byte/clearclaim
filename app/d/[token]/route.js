import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, no-login route that serves a shared document from our own domain:
//   https://clearclaimapp.com/d/<token>
// It looks the token up with the service role (bypassing RLS), then streams the
// file out of the private "documents" bucket. Unknown or revoked tokens 404.

function notFound(message) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Link unavailable</title>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:12vh auto;padding:0 1.25rem;color:#1f2a44">` +
    `<h1 style="font-size:1.25rem">This link isn't available</h1>` +
    `<p style="color:#5b667d">${message}</p>` +
    `<p style="color:#5b667d">If you need the document, ask whoever shared it to send a fresh link.</p>` +
    `</div>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

const CONTENT_TYPES = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", heic: "image/heic", heif: "image/heif",
  txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_req, { params }) {
  const token = String(params?.token || "");
  if (!token) return notFound("The link is incomplete.");

  const admin = createAdminClient();
  if (!admin) return notFound("Sharing isn't configured on this server.");

  const { data: row, error } = await admin
    .from("share_tokens")
    .select("path, name, revoked")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) return notFound("The link is invalid.");
  if (row.revoked) return notFound("The owner has turned this link off.");

  const { data: blob, error: dlErr } = await admin.storage.from("documents").download(row.path);
  if (dlErr || !blob) return notFound("The file could not be found.");

  const name = (row.name || row.path.split("/").pop() || "document").replace(/[^\w.\-]+/g, "_");
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const type = blob.type && blob.type !== "application/octet-stream"
    ? blob.type
    : (CONTENT_TYPES[ext] || "application/octet-stream");

  return new Response(blob, {
    status: 200,
    headers: {
      "content-type": type,
      // inline so reviewers see it in the browser; filename preserved for save-as
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, max-age=60",
    },
  });
}

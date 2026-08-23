"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Provider business profile editor: the details that fill the letterhead on
// branded course documents. Used on the provider setup page and in Settings.
export default function ProviderProfileForm({ profile, userId, redirectTo }) {
  const router = useRouter();
  const supabase = createClient();

  const [f, setF] = useState({
    business_name: profile?.business_name || "",
    services: profile?.services || "",
    provider_name: profile?.provider_name || "",
    credentials: profile?.credentials || "",
    contact_email: profile?.contact_email || "",
    contact_phone: profile?.contact_phone || "",
    contact_website: profile?.contact_website || "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  // Show the current logo (private bucket → signed URL).
  useEffect(() => {
    let active = true;
    (async () => {
      if (profile?.logo_path) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(profile.logo_path, 3600);
        if (active && data?.signedUrl) setLogoPreview(data.signedUrl);
      }
    })();
    return () => { active = false; };
  }, [profile?.logo_path]);

  function pickLogo(file) {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    try {
      let logo_path = profile?.logo_path || null;
      if (logoFile) {
        const ext = (logoFile.name.split(".").pop() || "png").toLowerCase();
        const path = `${userId}/branding/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(path, logoFile, { upsert: true });
        if (upErr) { setErr("Logo upload failed: " + upErr.message); setBusy(false); return; }
        logo_path = path;
      }
      const { error } = await supabase.from("profiles").upsert({ user_id: userId, is_provider: true, ...f, logo_path });
      if (error) { setErr("Could not save: " + error.message); setBusy(false); return; }
      setMsg("Saved.");
      router.refresh();
      if (redirectTo) setTimeout(() => router.push(redirectTo), 700);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <div>
      <div className="row">
        <div><label>Business name</label><input value={f.business_name} onChange={e => set("business_name", e.target.value)} placeholder="e.g. Bright Path Tutoring" /></div>
        <div><label>Your name</label><input value={f.provider_name} onChange={e => set("provider_name", e.target.value)} placeholder="e.g. Jane Doe" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Credentials</label><input value={f.credentials} onChange={e => set("credentials", e.target.value)} placeholder="e.g. M.Ed., CALT" /></div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Services you offer</label>
        <textarea rows={3} value={f.services} onChange={e => set("services", e.target.value)} placeholder={"One per line, e.g.\nReading tutoring\nPiano lessons\nHigh school biology"} />
        <p className="finenote" style={{ marginTop: 4 }}>List each service on its own line. You can pick from these when you set up a class.</p>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>Contact email</label><input value={f.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="you@business.com" /></div>
        <div><label>Contact phone</label><input value={f.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="(555) 555-5555" /></div>
        <div><label>Website</label><input value={f.contact_website} onChange={e => set("contact_website", e.target.value)} placeholder="www.business.com" /></div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Logo (shown on your documents)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {logoPreview && <img src={logoPreview} alt="Logo preview" style={{ height: 54, maxWidth: 160, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 4 }} />}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => pickLogo(e.target.files?.[0] || null)} />
        </div>
        <p className="finenote" style={{ marginTop: 4 }}>PNG or JPG. A logo with a transparent or white background looks best on the letterhead.</p>
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
      {msg && <p style={{ color: "var(--teal)", fontSize: 13 }}>{msg}</p>}

      <button className="primary" disabled={busy} onClick={save} style={{ marginTop: 12 }}>
        {busy ? "Saving…" : "Save business profile"}
      </button>
    </div>
  );
}

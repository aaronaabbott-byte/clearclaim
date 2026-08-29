import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { KidForm, KidEdit } from "../students";
import StudentReorder from "../student-reorder";
import ProviderProfileForm from "../provider-profile";
import CapLogger from "../cap-logger";

export default async function Settings() {
  const supabase = createClient();
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  const isParent = profile?.is_parent ?? true;
  const isProvider = profile?.is_provider ?? false;

  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const hasKids = kids && kids.length > 0;

  const { data: capEntries } = await supabase.from("cap_entries")
    .select("*").order("created_at", { ascending: false });
  const entriesFor = (kidId) => (capEntries || []).filter(e => e.kid_id === kidId);

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        {isProvider && <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Provider view</button></Link>}
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Your account</h2>
          <p className="sans" style={{ fontSize: 14, marginTop: -2 }}>
            You're set up as: <b>{[isParent && "Parent", isProvider && "Provider"].filter(Boolean).join(" + ") || "—"}</b>.
          </p>
          <p className="finenote" style={{ marginTop: 6 }}>
            Need a role added or removed? Email <a href="mailto:clearclaimhelp@gmail.com" style={{ color: "var(--navy2)" }}>clearclaimhelp@gmail.com</a> and we'll update it for you.
          </p>
        </div>

        {/* Business profile only for provider-only accounts. Dual-role (parent +
            provider) users edit it in the Provider view, so it doesn't clutter
            the parent's student settings page. */}
        {isProvider && !isParent && (
          <div className="card">
            <h2>Business profile</h2>
            <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
              These details form the letterhead on the documents you create in Provider view.
            </p>
            <ProviderProfileForm profile={profile} userId={user.id} />
          </div>
        )}

        {isParent && (
          <>
            <div className="card">
              <h2>Students</h2>
              <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
                Add, edit, remove, or reorder your students. This order is used everywhere, so put them however is
                easiest to track — birth order works well. These details carry into every claim and syllabus.
              </p>
              {hasKids && <StudentReorder kids={kids.map(k => ({ id: k.id, first_name: k.first_name, grade: k.grade }))} />}
              {hasKids ? kids.map(k => <KidEdit key={k.id} k={k} />)
                : <p className="muted sans" style={{ fontSize: 14 }}>No students yet — add your first below.</p>}
            </div>

            <div className="card">
              <h2>Add a student</h2>
              {/* key on the student count remounts the form after each add, so the
                  fields clear instead of carrying the last student's values over. */}
              <KidForm key={kids?.length ?? 0} first={!hasKids} />
            </div>

            {hasKids && (
              <div className="card">
                <h2>Track marketplace &amp; approved spend</h2>
                <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
                  For orders that don't go through a claim packet — like an approved ClassWallet Marketplace purchase —
                  log the base price here so it still counts against the caps on your dashboard.
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  {kids.map(k => <CapLogger key={k.id} kid={k} entries={entriesFor(k.id)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

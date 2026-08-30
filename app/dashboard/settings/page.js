import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { KidForm, KidEdit } from "../students";
import StudentReorder from "../student-reorder";
import ProviderProfileForm from "../provider-profile";
import CapLogger from "../cap-logger";
import StatePicker from "@/app/welcome/state-picker";
import { getStateConfig } from "@/lib/states";
import { isAdmin } from "@/lib/admin";

const DEMO_EMAIL = "demo@clearclaimapp.com";

export default async function Settings() {
  const supabase = createClient();
  const { user, profile, stateConfig } = await getProfile();
  if (!user) redirect("/login");
  const showCaps = !!(stateConfig?.features?.techCap || stateConfig?.features?.percentCaps);
  const showAward = !!stateConfig?.features?.perStudentAward;
  // Changing state swaps the whole rulebook, so regular users can't switch it
  // themselves — only the demo account and admins can (for demos/support).
  const canSwitchState = isAdmin(user.email) || (user.email || "").toLowerCase() === DEMO_EMAIL;
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

        <div className="card">
          <h2>Your program</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: canSwitchState ? 12 : 4 }}>
            You're set to <b>{getStateConfig(profile?.state).name} — {getStateConfig(profile?.state).program}</b>.
            ClearClaim tailors categories, caps, and documentation to this program.
          </p>
          {canSwitchState
            ? <StatePicker userId={user.id} current={profile?.state || "AR"} compact />
            : <p className="finenote">Your program is set when you sign up. If you've moved to a different state's program and need it changed, email <a href="mailto:clearclaimhelp@gmail.com" style={{ color: "var(--navy2)" }}>clearclaimhelp@gmail.com</a>.</p>}
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
            {/* Order + Add a student, together with nothing between them. */}
            <div className="card">
              <h2>Students</h2>
              <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
                Reorder your students (the order is used everywhere — birth order works well), then add a new one.
                Edit each student's details further down.
              </p>
              {hasKids
                ? <StudentReorder kids={kids.map(k => ({ id: k.id, first_name: k.first_name, grade: k.grade }))} />
                : <p className="muted sans" style={{ fontSize: 14 }}>No students yet — add your first below.</p>}
              <div style={{ marginTop: hasKids ? 16 : 4, paddingTop: hasKids ? 16 : 0, borderTop: hasKids ? "1px solid var(--line)" : "none" }}>
                <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", margin: "0 0 8px" }}>Add a student</h3>
                {/* key on the student count remounts the form after each add, so the
                    fields clear instead of carrying the last student's values over. */}
                <KidForm key={kids?.length ?? 0} first={!hasKids} showAward={showAward} />
              </div>
            </div>

            {/* One box per student: their details and their cap tracking stacked
                together, so everything for a student lives in one place. */}
            {hasKids && (
              <div className="card">
                <h2>{showCaps ? "Student details & tracking" : "Student details"}</h2>
                <p className="muted sans" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
                  {showCaps
                    ? "Edit a student and log any marketplace / approved spend for them in the same place. Logged spend counts toward the caps on your dashboard."
                    : "Edit each student's details."}
                </p>
                <div style={{ display: "grid", gap: 14 }}>
                  {kids.map(k => (
                    <div key={k.id} className="kid" style={{ display: "block", padding: "16px 18px" }}>
                      <div className="sans" style={{ fontWeight: 700, fontSize: 15, color: "var(--navy)", marginBottom: 10 }}>
                        {k.first_name}{k.grade ? <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> · grade {k.grade}</span> : null}
                      </div>
                      <KidEdit k={k} bare showAward={showAward} />
                      {showCaps && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                          <CapLogger kid={k} entries={entriesFor(k.id)} bare />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

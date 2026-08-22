import Link from "next/link";
import { SETTINGS } from "@/lib/rules";
import { addKid, updateKid, deleteKid, signOut } from "./actions";

export function SettingSelect({ value }) {
  return (
    <select name="setting" defaultValue={value || "homeschool"}>
      {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

export function TierToggle({ value }) {
  return (
    <label className="sans" style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 400, color: "var(--ink)", fontSize: 14, marginTop: 7, cursor: "pointer" }}>
      <input type="checkbox" name="funding_tier" value="succeed" defaultChecked={value === "succeed"} style={{ width: 18, height: 18 }} />
      Succeed student — higher funding, raises the 25% caps
    </label>
  );
}

// Add-a-student form (blank).
export function KidForm({ first = true }) {
  return (
    <form action={addKid}>
      <div className="row">
        <div><label>First name<span style={{ color: "#b3261e" }}> *</span></label>
          <input name="first_name" required placeholder="e.g. Alex" /></div>
        <div><label>Grade</label><input name="grade" placeholder="e.g. 5" /></div>
        <div><label>Setting</label><SettingSelect /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>School name (skip if homeschool)</label><input name="school_name" /></div>
        <div><label>Subjects / courses (optional)</label><input name="subjects" placeholder="Math, Latin, Science" /></div>
        <div><label>Year joined EFA (optional)</label><input name="program_start_year" inputMode="numeric" placeholder="e.g. 2026" /></div>
      </div>
      <TierToggle />
      <button className="primary" style={{ marginTop: 14 }}>{first ? "Add your first student" : "Add student"}</button>
    </form>
  );
}

// Inline editable student card.
export function KidEdit({ k }) {
  return (
    <div className="kid" style={{ display: "block", padding: "16px 18px" }}>
      <form action={updateKid}>
        <input type="hidden" name="id" value={k.id} />
        <div className="row">
          <div><label>First name<span style={{ color: "#b3261e" }}> *</span></label>
            <input name="first_name" required defaultValue={k.first_name} /></div>
          <div><label>Grade</label><input name="grade" defaultValue={k.grade || ""} /></div>
          <div><label>Setting</label><SettingSelect value={k.setting} /></div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>School name (skip if homeschool)</label><input name="school_name" defaultValue={k.school_name || ""} /></div>
          <div><label>Subjects / courses</label><input name="subjects" defaultValue={k.subjects || ""} /></div>
          <div><label>Year joined EFA</label><input name="program_start_year" inputMode="numeric" defaultValue={k.program_start_year || ""} placeholder="e.g. 2026" /></div>
        </div>
        <TierToggle value={k.funding_tier} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="primary">Save changes</button>
        </div>
      </form>
      <form action={deleteKid} style={{ marginTop: 8 }}>
        <input type="hidden" name="id" value={k.id} />
        <button style={{ color: "var(--red)", borderColor: "#e3b7b3" }}>Remove student</button>
      </form>
    </div>
  );
}

// App header. `settings` shows a gear link; sign-out always present.
export function Bar({ email, settings = true }) {
  return (
    <header>
      <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
      <h1>ClearClaim</h1>
      <span className="spacer" />
      {email && <span className="sans" style={{ color: "#cadaee", fontSize: 14 }}>{email}</span>}
      {settings && (
        <Link href="/dashboard/settings">
          <button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Settings</button>
        </Link>
      )}
      <form action={signOut}><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Sign out</button></form>
    </header>
  );
}

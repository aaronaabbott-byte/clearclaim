import Link from "next/link";
import { SETTINGS } from "@/lib/rules";
import { addKid, updateKid, deleteKid } from "./actions";
import HeaderMenu from "./header-menu";

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

// Optional per-student scholarship award (states where the award varies).
function AwardField({ value }) {
  return (
    <div style={{ marginTop: 8 }}>
      <label>Scholarship award (optional)</label>
      <input name="award_amount" inputMode="decimal" defaultValue={value ?? ""} placeholder="e.g. 8000" />
      <p className="finenote" style={{ marginTop: 4 }}>This student's annual scholarship amount. Used to track the percentage-of-award caps on your dashboard.</p>
    </div>
  );
}

// Add-a-student form (blank). `showAward` reveals the award field for states
// where the scholarship varies per student (e.g. Utah, Arizona disability).
export function KidForm({ first = true, showAward = false, showTier = true }) {
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
      <div style={{ marginTop: 8 }}>
        <label>Technology received through EFA in prior years (optional)</label>
        <input name="prior_tech" placeholder="e.g. tablet (2025); printer (2025)" />
        <p className="finenote" style={{ marginTop: 4 }}>Devices and the year only. Used to strengthen technology requests and avoid duplication. Do not enter any health or medical information.</p>
      </div>
      {showAward && <AwardField />}
      {showTier && <TierToggle />}
      <button className="primary" style={{ marginTop: 14 }}>{first ? "Add your first student" : "Add student"}</button>
    </form>
  );
}

// Inline editable student card. `bare` drops the outer box so it can be nested
// inside a per-student card that also holds the cap tracker.
export function KidEdit({ k, bare = false, showAward = false, showTier = true }) {
  const inner = (
    <>
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
        <div style={{ marginTop: 8 }}>
          <label>Technology received through EFA in prior years</label>
          <input name="prior_tech" defaultValue={k.prior_tech || ""} placeholder="e.g. tablet (2025); printer (2025)" />
          <p className="finenote" style={{ marginTop: 4 }}>Devices and the year only. Used to strengthen technology requests and avoid duplication. Do not enter any health or medical information.</p>
        </div>
        {showAward && <AwardField value={k.award_amount} />}
        {showTier && <TierToggle value={k.funding_tier} />}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="primary">Save changes</button>
        </div>
      </form>
      <form action={deleteKid} style={{ marginTop: 8 }}>
        <input type="hidden" name="id" value={k.id} />
        <button style={{ color: "var(--red)", borderColor: "#e3b7b3" }}>Remove student</button>
      </form>
    </>
  );
  if (bare) return inner;
  return <div className="kid" style={{ display: "block", padding: "16px 18px" }}>{inner}</div>;
}

// App header. `settings` shows a gear link; sign-out always present.
// `admin` shows an Admin link; `providerView` / `parentView` show cross-links
// between the two views (only for accounts that have both roles).
export function Bar({ email, settings = true, admin = false, providerView = false, parentView = false }) {
  const items = [];
  if (providerView) items.push({ label: "Provider view", href: "/provider" });
  if (parentView) items.push({ label: "Parent view", href: "/dashboard" });
  if (settings) items.push({ label: "Settings", href: "/dashboard/settings" });
  items.push({ label: "Plans & billing", href: "/upgrade" });
  if (admin) items.push({ label: "Admin", href: "/admin" });
  return (
    <header>
      <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
      <span className="spacer" />
      {email && <span className="sans hide-sm" style={{ color: "#cadaee", fontSize: 14 }}>{email}</span>}
      <HeaderMenu items={items} />
    </header>
  );
}

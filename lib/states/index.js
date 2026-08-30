// Multi-state registry. `getStateConfig(code)` returns the rulebook the whole
// app should read for an account; `STATE_META` drives the registration map.
import { AR } from "./ar";
import { AZ } from "./az";
import { UT } from "./ut";

export const STATE_CONFIGS = { AR, AZ, UT };
export const DEFAULT_STATE = "AR";

export function getStateConfig(code) {
  return STATE_CONFIGS[String(code || DEFAULT_STATE).toUpperCase()] || AR;
}
export function isSupportedState(code) {
  return !!STATE_CONFIGS[String(code || "").toUpperCase()];
}

// Map statuses:
//   active    — ClearClaim supports it now (selectable)
//   soon      — committed next (shown "coming soon", not selectable)
//   potential — has a homeschool-eligible ESA/EFA program; candidate (shaded)
//   none      — no homeschool ESA program (muted): no funding, or private/
//               special-needs-only
// `platform` is the payment system a program runs on — the submission flow is
// grouped by platform, so it drives our rollout order. Source: Ann's 50-state
// spreadsheet (numbers collected last year — verify current-year before shipping).
export const STATE_META = [
  { code: "AR", name: "Arkansas", status: "active", platform: "ClassWallet" },
  { code: "AZ", name: "Arizona", status: "active", platform: "ClassWallet" },
  { code: "UT", name: "Utah", status: "active", platform: "Odyssey" },

  { code: "AL", name: "Alabama", status: "potential", platform: "ClassWallet" },
  { code: "NH", name: "New Hampshire", status: "potential", platform: "ClassWallet" },
  { code: "NC", name: "North Carolina", status: "potential", platform: "ClassWallet" },
  { code: "SC", name: "South Carolina", status: "potential", platform: "ClassWallet" },
  { code: "GA", name: "Georgia", status: "potential", platform: "Odyssey" },
  { code: "LA", name: "Louisiana", status: "potential", platform: "Odyssey" },
  { code: "TX", name: "Texas", status: "potential", platform: "Odyssey" },
  { code: "WY", name: "Wyoming", status: "potential", platform: "Odyssey" },
  { code: "FL", name: "Florida", status: "potential", platform: "Step Up" },
  { code: "AK", name: "Alaska", status: "potential", platform: "IDEA" },
  { code: "MS", name: "Mississippi", status: "potential" },
  { code: "OH", name: "Ohio", status: "potential" },
  { code: "TN", name: "Tennessee", status: "potential" },
  { code: "WV", name: "West Virginia", status: "potential" },

  { code: "CA", name: "California", status: "none" },
  { code: "CO", name: "Colorado", status: "none" },
  { code: "CT", name: "Connecticut", status: "none" },
  { code: "DE", name: "Delaware", status: "none" },
  { code: "HI", name: "Hawaii", status: "none" },
  { code: "IA", name: "Iowa", status: "none" },
  { code: "ID", name: "Idaho", status: "none" },
  { code: "IL", name: "Illinois", status: "none" },
  { code: "IN", name: "Indiana", status: "none" },
  { code: "KS", name: "Kansas", status: "none" },
  { code: "KY", name: "Kentucky", status: "none" },
  { code: "MA", name: "Massachusetts", status: "none" },
  { code: "MD", name: "Maryland", status: "none" },
  { code: "ME", name: "Maine", status: "none" },
  { code: "MI", name: "Michigan", status: "none" },
  { code: "MN", name: "Minnesota", status: "none" },
  { code: "MO", name: "Missouri", status: "none" },
  { code: "MT", name: "Montana", status: "none" },
  { code: "ND", name: "North Dakota", status: "none" },
  { code: "NE", name: "Nebraska", status: "none" },
  { code: "NJ", name: "New Jersey", status: "none" },
  { code: "NM", name: "New Mexico", status: "none" },
  { code: "NV", name: "Nevada", status: "none" },
  { code: "NY", name: "New York", status: "none" },
  { code: "OK", name: "Oklahoma", status: "none" },
  { code: "OR", name: "Oregon", status: "none" },
  { code: "PA", name: "Pennsylvania", status: "none" },
  { code: "RI", name: "Rhode Island", status: "none" },
  { code: "SD", name: "South Dakota", status: "none" },
  { code: "VA", name: "Virginia", status: "none" },
  { code: "VT", name: "Vermont", status: "none" },
  { code: "WA", name: "Washington", status: "none" },
  { code: "WI", name: "Wisconsin", status: "none" },
];

export const STATUS_LABEL = {
  active: "Available now",
  soon: "Coming soon",
  potential: "Has an ESA — on our radar",
  none: "No ESA program yet",
};

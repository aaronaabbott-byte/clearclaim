// Multi-state registry. `getStateConfig(code)` returns the rulebook the whole
// app should read for an account; `STATE_META` drives the registration map.
import { AR } from "./ar";
import { AZ } from "./az";

export const STATE_CONFIGS = { AR, AZ };
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
//   potential — has an ESA/voucher program; candidate for later (shaded)
//   none      — no ESA-style program today (muted)
// This list is our best current read and is easy to adjust as programs change.
export const STATE_META = [
  { code: "AR", name: "Arkansas", status: "active" },
  { code: "AZ", name: "Arizona", status: "active" },
  { code: "UT", name: "Utah", status: "soon" },

  { code: "FL", name: "Florida", status: "potential" },
  { code: "IN", name: "Indiana", status: "potential" },
  { code: "IA", name: "Iowa", status: "potential" },
  { code: "MT", name: "Montana", status: "potential" },
  { code: "NC", name: "North Carolina", status: "potential" },
  { code: "NH", name: "New Hampshire", status: "potential" },
  { code: "OH", name: "Ohio", status: "potential" },
  { code: "OK", name: "Oklahoma", status: "potential" },
  { code: "SC", name: "South Carolina", status: "potential" },
  { code: "TN", name: "Tennessee", status: "potential" },
  { code: "WV", name: "West Virginia", status: "potential" },
  { code: "WY", name: "Wyoming", status: "potential" },
  { code: "AL", name: "Alabama", status: "potential" },
  { code: "LA", name: "Louisiana", status: "potential" },
  { code: "MO", name: "Missouri", status: "potential" },
  { code: "GA", name: "Georgia", status: "potential" },
  { code: "TX", name: "Texas", status: "potential" },
  { code: "ID", name: "Idaho", status: "potential" },
  { code: "KS", name: "Kansas", status: "potential" },
  { code: "NE", name: "Nebraska", status: "potential" },
  { code: "MS", name: "Mississippi", status: "potential" },
  { code: "SD", name: "South Dakota", status: "potential" },
  { code: "WI", name: "Wisconsin", status: "potential" },

  { code: "AK", name: "Alaska", status: "none" },
  { code: "CA", name: "California", status: "none" },
  { code: "CO", name: "Colorado", status: "none" },
  { code: "CT", name: "Connecticut", status: "none" },
  { code: "DE", name: "Delaware", status: "none" },
  { code: "HI", name: "Hawaii", status: "none" },
  { code: "IL", name: "Illinois", status: "none" },
  { code: "KY", name: "Kentucky", status: "none" },
  { code: "MA", name: "Massachusetts", status: "none" },
  { code: "MD", name: "Maryland", status: "none" },
  { code: "ME", name: "Maine", status: "none" },
  { code: "MI", name: "Michigan", status: "none" },
  { code: "MN", name: "Minnesota", status: "none" },
  { code: "ND", name: "North Dakota", status: "none" },
  { code: "NJ", name: "New Jersey", status: "none" },
  { code: "NM", name: "New Mexico", status: "none" },
  { code: "NV", name: "Nevada", status: "none" },
  { code: "NY", name: "New York", status: "none" },
  { code: "OR", name: "Oregon", status: "none" },
  { code: "PA", name: "Pennsylvania", status: "none" },
  { code: "RI", name: "Rhode Island", status: "none" },
  { code: "VA", name: "Virginia", status: "none" },
  { code: "VT", name: "Vermont", status: "none" },
  { code: "WA", name: "Washington", status: "none" },
];

export const STATUS_LABEL = {
  active: "Available now",
  soon: "Coming soon",
  potential: "Has an ESA — on our radar",
  none: "No ESA program yet",
};

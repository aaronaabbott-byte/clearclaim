import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Driving distance between two addresses, for the mileage log. Uses Google's
// Distance Matrix API, which takes the raw address strings (it geocodes +
// routes in one call) — the closest match to the "GPS mileage" the state asks
// for. Returns ONE-WAY miles; the client doubles it when round-trip is checked.
// Requires GOOGLE_MAPS_API_KEY in the environment (Distance Matrix API enabled,
// billing on). The parent can always edit the filled-in number by hand.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "No GOOGLE_MAPS_API_KEY on the server — add it in Vercel and redeploy." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const start = String(body?.start || "").trim().slice(0, 300);
  const end = String(body?.end || "").trim().slice(0, 300);
  if (!start || !end) return NextResponse.json({ error: "Enter both a start and end address first." }, { status: 400 });

  try {
    const url = "https://maps.googleapis.com/maps/api/distancematrix/json"
      + `?units=imperial&mode=driving&origins=${encodeURIComponent(start)}`
      + `&destinations=${encodeURIComponent(end)}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return NextResponse.json({ error: "Lookup failed — type the miles in by hand." }, { status: 502 });
    const j = await r.json();
    if (j.status !== "OK") {
      // Surface Google's own reason so setup problems are diagnosable on-screen.
      // REQUEST_DENIED = key/billing/API-not-enabled or a key restriction (e.g. an
      // HTTP-referrer restriction blocks server calls — use None or IP instead).
      const detail = j.error_message ? ` (${j.error_message})` : "";
      return NextResponse.json({ error: `Google rejected the lookup: ${j.status}${detail}` }, { status: 502 });
    }
    const el = j?.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK" || !el.distance?.value) {
      const notFound = el?.status === "NOT_FOUND" || el?.status === "ZERO_RESULTS";
      return NextResponse.json({ error: notFound ? "Couldn't find a driving route between those addresses — check them, or type the miles in by hand." : "Couldn't look that up — type the miles in by hand." }, { status: 422 });
    }
    const meters = el.distance.value;
    const miles = Math.round((meters / 1609.344) * 10) / 10; // one-way, 1 decimal
    return NextResponse.json({ miles, meters, text: el.distance.text });
  } catch (e) {
    await logError("api/trip-distance", e);
    return NextResponse.json({ error: "Lookup failed — type the miles in by hand." }, { status: 500 });
  }
}

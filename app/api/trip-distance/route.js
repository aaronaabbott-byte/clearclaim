import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Driving distance between two addresses, for the mileage log. Uses Google's
// Routes API (computeRoutes), which takes the raw address strings (it geocodes +
// routes in one call) — the closest match to the "GPS mileage" the state asks
// for. Returns ONE-WAY miles; the client doubles it when round-trip is checked.
// Requires GOOGLE_MAPS_API_KEY in the environment, with the **Routes API**
// enabled on the project and allowed by the key. The parent can always edit the
// filled-in number by hand. (The old Distance Matrix API is legacy and is no
// longer enabled for new Google projects, which is why we use Routes API.)
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
    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: start },
        destination: { address: end },
        travelMode: "DRIVE",
        units: "IMPERIAL",
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Surface Google's own reason so setup problems are diagnosable on-screen.
      // A denial here usually means the Routes API isn't enabled on the project
      // or isn't allowed by the key's API restrictions.
      const detail = j?.error?.message ? ` (${j.error.message})` : "";
      return NextResponse.json({ error: `Google rejected the lookup: ${j?.error?.status || r.status}${detail}` }, { status: 502 });
    }
    const route = j?.routes?.[0];
    if (!route || route.distanceMeters == null) {
      return NextResponse.json({ error: "Couldn't find a driving route between those addresses — check them, or type the miles in by hand." }, { status: 422 });
    }
    const meters = route.distanceMeters;
    const miles = Math.round((meters / 1609.344) * 10) / 10; // one-way, 1 decimal
    return NextResponse.json({ miles, meters });
  } catch (e) {
    await logError("api/trip-distance", e);
    return NextResponse.json({ error: "Lookup failed — type the miles in by hand." }, { status: 500 });
  }
}

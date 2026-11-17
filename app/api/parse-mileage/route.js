import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Parses the state's "Travel Reimbursement Request Form" (.xlsx) that a family
// already filled out, so ClearClaim can read the trips back in and re-render them
// as an upload ClassWallet will accept. Layout (confirmed from the state template):
//   B3 = Student Name, B4 = Current Date, row 6 = header, rows 7+ = trips
//   A = Date of Trip, B = Name of Starting Location, C = Address of Starting Location,
//   D = Name of Ending Location, E = Address of Ending Location,
//   F = Round Trip?, G = Mileage (per GPS). Stops at the first empty date row.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const b64 = String(body?.fileBase64 || "");
  if (b64.length < 50) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (b64.length > 9_000_000) return NextResponse.json({ error: "That file is too large." }, { status: 413 });

  try {
    const buf = Buffer.from(b64, "base64");
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return NextResponse.json({ error: "That sheet looks empty." }, { status: 422 });

    const cell = (addr) => {
      const c = ws[addr];
      return c == null ? "" : String(c.w ?? c.v ?? "").trim();
    };
    const truthy = (v) => /^(y|yes|true|x|1|✓)/i.test(String(v).trim());

    const studentName = cell("B3");
    const date = cell("B4");

    const trips = [];
    for (let r = 7; r <= 500; r++) {
      const d = cell(`A${r}`);
      const startName = cell(`B${r}`);
      const miles = cell(`G${r}`);
      // Stop once we hit a fully blank trip row.
      if (!d && !startName && !miles) break;
      if (!d && !startName && !cell(`D${r}`) && !miles) continue;
      trips.push({
        date: d,
        startName,
        startAddr: cell(`C${r}`),
        endName: cell(`D${r}`),
        endAddr: cell(`E${r}`),
        roundTrip: truthy(cell(`F${r}`)),
        miles: Number(String(miles).replace(/[^0-9.]/g, "")) || 0,
      });
    }

    if (!trips.length) {
      return NextResponse.json({ error: "Couldn't find any trips in that sheet. Make sure it's the state's Travel Reimbursement Request Form." }, { status: 422 });
    }
    return NextResponse.json({ studentName, date, trips });
  } catch (e) {
    await logError("api/parse-mileage", e);
    return NextResponse.json({ error: "Couldn't read that file — enter the trips by hand." }, { status: 500 });
  }
}

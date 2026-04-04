// apps/dashboard/src/app/api/sync-spills/route.ts
// POST /api/sync-spills

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

const NY_URL = "https://data.ny.gov/resource/u44d-k5fk.json";
const PAGE_SIZE = 1000;

export async function POST() {
  try {
    let offset = 0;
    let total = 0;

    while (true) {
      const res = await fetch(
        `${NY_URL}?$limit=${PAGE_SIZE}&$offset=${offset}&$where=county='Albany'`,
        { headers: { "X-App-Token": process.env.SODA_KEY ?? "" } }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NY API error ${res.status}: ${text}`);
      }

      const rows = await res.json();
      if (!rows.length) break;

      const mapped = rows.map((r: any) => ({
        spill_number: r.spill_number ?? null,
        program_facility_name: r.program_facility_name ?? null,
        street_1: r.street_1 ?? null,
        street_2: r.street_2 ?? null,
        locality: r.locality ?? null,
        county: r.county ?? null,
        zip_code: r.zip_code ?? null,
        swis_code: r.swis_code ?? null,
        dec_region: r.dec_region ? parseInt(r.dec_region) : null,
        spill_date: r.spill_date ?? null,
        received_date: r.received_date ?? null,
        contributing_factor: r.contributing_factor ?? null,
        waterbody: r.waterbody ?? null,
        source: r.source ?? null,
        close_date: r.close_date ?? null,
        material_name: r.material_name ?? null,
        material_family: r.material_family ?? null,
        quantity: r.quantity ? parseInt(r.quantity) : null,
        units: r.units ?? null,
        recovered: r.recovered ? parseInt(r.recovered) : null,
      }));

      // Deduplicate by spill_number — keep the last occurrence
      const deduped = Object.values(
        mapped.reduce((acc: any, row: any) => {
          acc[row.spill_number ?? Math.random()] = row;
          return acc;
        }, {})
      );

      const { error } = await supabase
        .from("NyGovData")
        .upsert(deduped, { onConflict: "spill_number" });

      if (error) throw new Error(`Supabase error: ${error.message}`);

      total += deduped.length;
      console.log(`Upserted ${deduped.length} rows (total: ${total})`);

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({ success: true, total });
  } catch (err: any) {
    console.error("[sync-spills]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
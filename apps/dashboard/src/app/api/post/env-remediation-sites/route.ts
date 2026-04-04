// apps/dashboard/src/app/api/sync-remediation/route.ts
// POST /api/sync-remediation

import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

const NY_URL = "https://data.ny.gov/resource/c6ci-rzpg.json";
const PAGE_SIZE = 1000;

export async function POST() {
  try {
    let offset = 0;
    let total = 0;

    while (true) {
      const res = await fetch(
        `${NY_URL}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=program_number ASC`,
        { headers: { "X-App-Token": process.env.SODA_KEY ?? "" } }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NY API error ${res.status}: ${text}`);
      }

      const rows = await res.json();
      if (!rows.length) break;

      const mapped = rows.map((r: any) => ({
        program_number:        r.program_number ?? null,
        program_type:          r.program_type ?? null,
        program_facility_name: r.program_facility_name ?? null,
        site_class:            r.siteclass ?? null,
        address1:              r.address1 ?? null,
        address2:              r.address2 ?? null,
        locality:              r.locality ?? null,
        county:                r.county ?? null,
        zip_code:              r.zipcode ?? null,
        swis_code:             r.swis_code ?? null,
        dec_region:            r.dec_region ? parseInt(r.dec_region) : null,
        latitude:              r.latitude ? parseFloat(r.latitude) : null,
        longitude:             r.longitude ? parseFloat(r.longitude) : null,
        georeference:          r.georeference ? JSON.stringify(r.georeference) : null,
        control_code:          r.control_code ?? null,
        control_type:          r.control_type ?? null,
        ou:                    r.ou ?? null,
        project_name:          r.project_name ?? null,
        project_completion_date: r.project_completion_date ?? null,
        waste_name:            r.waste_name ?? null,
        contaminants:          r.contaminants ?? null,
        owner_name:            r.owner_name ?? null,
        owner_address1:        r.owner_address1 ?? null,
        owner_address2:        r.owner_address2 ?? null,
        owner_city:            r.owner_city ?? null,
        owner_state:           r.owner_state ?? null,
        owner_zip:             r.owner_zip ?? null,
        disposal_name:         r.disposal_name ?? null,
        disposal_address1:     r.disposal_address1 ?? null,
        disposal_address2:     r.disposal_address2 ?? null,
        disposal_city:         r.disposal_city ?? null,
        disposal_zip:          r.disposal_zip ?? null,
        disposal_state:        r.disposal_state ?? null,
        operator_name:         r.operator_name ?? null,
        operator_address1:     r.operator_address1 ?? null,
        operator_address2:     r.operator_address2 ?? null,
        operator_city:         r.operator_city ?? null,
        operator_state:        r.operator_state ?? null,
        operator_zip:          r.operator_zip ?? null,
      }));

      // Deduplicate by program_number within the page
      const deduped = Object.values(
        mapped.reduce((acc: any, row: any) => {
          acc[row.program_number ?? Math.random()] = row;
          return acc;
        }, {})
      );

      const { error } = await supabase
        .from("EnvironmentalRemediationSites")
        .upsert(deduped, { onConflict: "program_number" });

      if (error) throw new Error(`Supabase error: ${error.message}`);

      total += deduped.length;
      console.log(`Upserted ${deduped.length} rows (total: ${total})`);

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({ success: true, total });
  } catch (err: any) {
    console.error("[sync-remediation]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
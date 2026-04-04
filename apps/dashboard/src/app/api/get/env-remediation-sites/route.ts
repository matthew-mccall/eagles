import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const minLong = searchParams.get("min_long");
  const maxLong = searchParams.get("max_long");

  if (!minLong || !maxLong) {
    return NextResponse.json(
      { error: "min_long and max_long query params are required" },
      { status: 400 }
    );
  }

  const minLongNum = parseFloat(minLong);
  const maxLongNum = parseFloat(maxLong);

  if (isNaN(minLongNum) || isNaN(maxLongNum)) {
    return NextResponse.json(
      { error: "min_long and max_long must be valid numbers" },
      { status: 400 }
    );
  }

  if (minLongNum > maxLongNum) {
    return NextResponse.json(
      { error: "min_long must be less than or equal to max_long" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("EnvironmentalRemediationSites")
    .select(
      `id,
      program_number,
      program_type,
      program_facility_name,
      site_class,
      address1,
      address2,
      locality,
      county,
      zip_code,
      dec_region,
      latitude,
      longitude,
      control_code,
      control_type,
      project_name,
      project_completion_date,
      waste_name,
      contaminants,
      owner_name`
    )
    .gte("longitude", minLongNum)
    .lte("longitude", maxLongNum);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: data.length, results: data });
}
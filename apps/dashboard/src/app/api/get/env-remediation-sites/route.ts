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
  const minLat = searchParams.get("min_lat");
  const maxLat = searchParams.get("max_lat");
  const limitParam = searchParams.get("limit");

  if (!minLong || !maxLong) {
    return NextResponse.json(
      { error: "min_long and max_long query params are required" },
      { status: 400 }
    );
  }

  const minLongNum = parseFloat(minLong);
  const maxLongNum = parseFloat(maxLong);
  const minLatNum = minLat ? parseFloat(minLat) : null;
  const maxLatNum = maxLat ? parseFloat(maxLat) : null;
  const limitNum = limitParam ? parseInt(limitParam, 10) : 500;

  if (isNaN(minLongNum) || isNaN(maxLongNum)) {
    return NextResponse.json(
      { error: "min_long and max_long must be valid numbers" },
      { status: 400 }
    );
  }

  if ((minLat !== null && minLatNum === null) || (maxLat !== null && maxLatNum === null)) {
    return NextResponse.json(
      { error: "min_lat and max_lat must be valid numbers when provided" },
      { status: 400 }
    );
  }

  if ((minLatNum !== null && isNaN(minLatNum)) || (maxLatNum !== null && isNaN(maxLatNum))) {
    return NextResponse.json(
      { error: "min_lat and max_lat must be valid numbers when provided" },
      { status: 400 }
    );
  }

  if (minLongNum > maxLongNum) {
    return NextResponse.json(
      { error: "min_long must be less than or equal to max_long" },
      { status: 400 }
    );
  }

  if (minLatNum !== null && maxLatNum !== null && minLatNum > maxLatNum) {
    return NextResponse.json(
      { error: "min_lat must be less than or equal to max_lat" },
      { status: 400 }
    );
  }

  if (isNaN(limitNum) || limitNum <= 0) {
    return NextResponse.json(
      { error: "limit must be a positive integer" },
      { status: 400 }
    );
  }

  const queryLimit = Math.min(limitNum, 2000);
  let query = supabase
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
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("longitude", minLongNum)
    .lte("longitude", maxLongNum)
    .limit(queryLimit);

  if (minLatNum !== null && maxLatNum !== null) {
    query = query.gte("latitude", minLatNum).lte("latitude", maxLatNum);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: data.length, results: data });
}
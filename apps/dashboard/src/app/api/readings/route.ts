import { supabase } from '../../../lib/supabase';
import type { GasReading, ReadingBatch } from '@org/shared';

/**
 * POST /api/readings — receive a batch of readings from the mobile app.
 * Stores into the Supabase `SensorReadings` table. Falls back to in-memory
 * if the table doesn't exist yet (so the dashboard still works during dev).
 */

// In-memory fallback for when Supabase table isn't set up yet
const memoryStore: GasReading[] = [];
const MAX_MEMORY = 500;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReadingBatch;

    if (!body.readings || !Array.isArray(body.readings)) {
      return Response.json({ error: 'Missing readings array' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const incoming: GasReading[] = body.readings.map((r, i) => ({
      ...r,
      id: r.id || `${body.deviceId}-${Date.now()}-${i}`,
      deviceId: r.deviceId || body.deviceId,
      timestamp: r.timestamp || now,
    }));

    // Try Supabase first
    const rows = incoming.map((r) => ({
      device_id: r.deviceId || body.deviceId,
      gas_type: r.gasType,
      ppm: r.ppm,
      severity: r.severity,
      latitude: r.lat,
      longitude: r.lng,
      timestamp: r.timestamp,
      raw_temperature: r.raw?.temperature ?? null,
      raw_humidity: r.raw?.humidity ?? null,
      raw_pressure: r.raw?.pressure ?? null,
      raw_gas_resistance: r.raw?.gasResistance ?? null,
      raw_iaq: r.raw?.iaq ?? null,
    }));

    const { error } = await supabase.from('SensorReadings').insert(rows);

    if (error) {
      // Table might not exist yet — fall back to memory
      console.warn('[readings POST] Supabase error, using memory fallback:', error.message);
      memoryStore.push(...incoming);
      if (memoryStore.length > MAX_MEMORY) {
        memoryStore.splice(0, memoryStore.length - MAX_MEMORY);
      }
    }

    return Response.json({
      ok: true,
      received: incoming.length,
      storage: error ? 'memory' : 'supabase',
    });
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

/**
 * GET /api/readings — fetch sensor readings.
 * Tries Supabase first, falls back to in-memory store.
 * Supports ?since=ISO&limit=N query params.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

  // Try Supabase
  let query = supabase
    .from('SensorReadings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte('timestamp', since);
  }

  const { data, error } = await query;

  if (!error && data) {
    // Map Supabase rows back to GasReading shape
    const readings: GasReading[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      lat: Number(row.latitude) || 0,
      lng: Number(row.longitude) || 0,
      gasType: String(row.gas_type),
      ppm: Number(row.ppm) || 0,
      severity: String(row.severity) as GasReading['severity'],
      timestamp: String(row.timestamp),
      deviceId: String(row.device_id || ''),
      raw: {
        temperature: row.raw_temperature as number | undefined,
        humidity: row.raw_humidity as number | undefined,
        pressure: row.raw_pressure as number | undefined,
        gasResistance: row.raw_gas_resistance as number | undefined,
        iaq: row.raw_iaq as number | undefined,
      },
    }));

    return Response.json({ readings, total: readings.length, source: 'supabase' });
  }

  // Fallback to memory
  console.warn('[readings GET] Supabase error, using memory fallback:', error?.message);
  let result = memoryStore;
  if (since) {
    const sinceDate = new Date(since).getTime();
    result = memoryStore.filter((r) => new Date(r.timestamp).getTime() > sinceDate);
  }

  return Response.json({
    readings: result.slice(-limit),
    total: result.length,
    source: 'memory',
  });
}

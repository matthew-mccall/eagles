import type { GasReading, ReadingBatch } from '@org/shared';

/**
 * In-memory store for readings received from mobile devices.
 * In production this would be a database — for now this lets
 * the dashboard poll for live data without any external deps.
 */
const readings: GasReading[] = [];
const MAX_READINGS = 500;

/** POST /api/readings — receive a batch of readings from the mobile app */
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

    readings.push(...incoming);

    // Keep only the most recent readings
    if (readings.length > MAX_READINGS) {
      readings.splice(0, readings.length - MAX_READINGS);
    }

    return Response.json({
      ok: true,
      received: incoming.length,
      total: readings.length,
    });
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

/** GET /api/readings — fetch stored readings (used by the dashboard) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const limit = Math.min(Number(searchParams.get('limit') || 100), MAX_READINGS);

  let result = readings;
  if (since) {
    const sinceDate = new Date(since).getTime();
    result = readings.filter((r) => new Date(r.timestamp).getTime() > sinceDate);
  }

  return Response.json({
    readings: result.slice(-limit),
    total: result.length,
  });
}

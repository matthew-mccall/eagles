export type GasReading = {
  id: string;
  lat: number;
  lng: number;
  gasType: string;
  ppm: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
};

// Mock data centered around Hudson Valley, NY area
export const mockReadings: GasReading[] = [
  // Cluster 1 — Newburgh industrial zone
  { id: 'r1', lat: 41.5034, lng: -74.0104, gasType: 'CO', ppm: 35, severity: 'low', timestamp: '2026-04-04T08:00:00Z' },
  { id: 'r2', lat: 41.5040, lng: -74.0110, gasType: 'CO', ppm: 120, severity: 'medium', timestamp: '2026-04-04T08:05:00Z' },
  { id: 'r3', lat: 41.5037, lng: -74.0098, gasType: 'H2S', ppm: 250, severity: 'high', timestamp: '2026-04-04T08:10:00Z' },
  { id: 'r4', lat: 41.5042, lng: -74.0115, gasType: 'CH4', ppm: 80, severity: 'medium', timestamp: '2026-04-04T08:15:00Z' },
  { id: 'r5', lat: 41.5030, lng: -74.0090, gasType: 'CO', ppm: 15, severity: 'low', timestamp: '2026-04-04T08:20:00Z' },

  // Cluster 2 — Poughkeepsie area
  { id: 'r6', lat: 41.7004, lng: -73.9209, gasType: 'H2S', ppm: 300, severity: 'high', timestamp: '2026-04-04T09:00:00Z' },
  { id: 'r7', lat: 41.7010, lng: -73.9215, gasType: 'H2S', ppm: 180, severity: 'high', timestamp: '2026-04-04T09:05:00Z' },
  { id: 'r8', lat: 41.7000, lng: -73.9200, gasType: 'CO', ppm: 45, severity: 'low', timestamp: '2026-04-04T09:10:00Z' },
  { id: 'r9', lat: 41.6998, lng: -73.9220, gasType: 'CH4', ppm: 150, severity: 'medium', timestamp: '2026-04-04T09:12:00Z' },

  // Cluster 3 — Kingston area
  { id: 'r10', lat: 41.9270, lng: -73.9974, gasType: 'CH4', ppm: 200, severity: 'high', timestamp: '2026-04-04T10:00:00Z' },
  { id: 'r11', lat: 41.9275, lng: -73.9980, gasType: 'CH4', ppm: 90, severity: 'medium', timestamp: '2026-04-04T10:05:00Z' },
  { id: 'r12', lat: 41.9268, lng: -73.9968, gasType: 'CO', ppm: 50, severity: 'medium', timestamp: '2026-04-04T10:10:00Z' },

  // Scattered individual readings
  { id: 'r13', lat: 41.6100, lng: -73.9600, gasType: 'CO', ppm: 10, severity: 'low', timestamp: '2026-04-04T11:00:00Z' },
  { id: 'r14', lat: 41.8200, lng: -73.9500, gasType: 'H2S', ppm: 5, severity: 'low', timestamp: '2026-04-04T11:30:00Z' },
  { id: 'r15', lat: 41.7500, lng: -74.0300, gasType: 'CH4', ppm: 400, severity: 'high', timestamp: '2026-04-04T12:00:00Z' },
  { id: 'r16', lat: 41.5500, lng: -73.8900, gasType: 'CO', ppm: 60, severity: 'medium', timestamp: '2026-04-04T12:15:00Z' },
  { id: 'r17', lat: 41.6500, lng: -74.0800, gasType: 'H2S', ppm: 220, severity: 'high', timestamp: '2026-04-04T12:30:00Z' },
  { id: 'r18', lat: 41.8800, lng: -74.0200, gasType: 'CH4', ppm: 30, severity: 'low', timestamp: '2026-04-04T13:00:00Z' },
  { id: 'r19', lat: 41.4800, lng: -74.0500, gasType: 'CO', ppm: 75, severity: 'medium', timestamp: '2026-04-04T13:30:00Z' },
  { id: 'r20', lat: 41.5800, lng: -73.9100, gasType: 'H2S', ppm: 350, severity: 'high', timestamp: '2026-04-04T14:00:00Z' },
];

export function readingsToGeoJSON(readings: GasReading[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: readings.map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.lng, r.lat],
      },
      properties: {
        id: r.id,
        gasType: r.gasType,
        ppm: r.ppm,
        severity: r.severity,
        timestamp: r.timestamp,
      },
    })),
  };
}

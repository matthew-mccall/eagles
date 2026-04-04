/**
 * Shared types for the Eagles gas detection pipeline.
 *
 * Flow: Arduino (Nicla Sense ME + BME688) -> BLE -> Mobile App -> HTTP API -> Dashboard
 *
 * The exact BLE payload format from the Arduino is TBD — the mobile app
 * will parse raw BLE data into these types before relaying to the dashboard.
 */

export type GasReading = {
  id: string;
  /** Latitude from phone GPS (the Nicla doesn't have GPS) */
  lat: number;
  /** Longitude from phone GPS */
  lng: number;
  /** Gas identifier — will be refined once BME688 config is finalized */
  gasType: string;
  /** Parts per million reading from the sensor */
  ppm: number;
  /** Derived severity level */
  severity: 'low' | 'medium' | 'high';
  /** ISO 8601 timestamp of when the reading was captured */
  timestamp: string;
  /** ID of the device that produced this reading */
  deviceId?: string;
  /** Raw sensor values from the BME688 (temperature, humidity, pressure, gas resistance) */
  raw?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    gasResistance?: number;
    iaq?: number;
  };
};

/** Payload sent from mobile app to the dashboard API */
export type ReadingBatch = {
  deviceId: string;
  readings: GasReading[];
};

/** Raw sensor payload — intermediate format before classification */
export type SensorPayload = {
  gasType: string;
  ppm: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  gasResistance?: number;
  iaq?: number;
};

/** Known gas types the BME688 can detect */
export const GAS_TYPES = ['CO', 'H2S', 'CH4', 'VOC'] as const;

/** Default PPM thresholds for severity classification (can be overridden) */
export const SEVERITY_THRESHOLDS: Record<string, { medium: number; high: number }> = {
  CO:   { medium: 50,  high: 200 },
  H2S:  { medium: 10,  high: 100 },
  CH4:  { medium: 100, high: 300 },
  VOC:  { medium: 50,  high: 150 },
};

/** Classify a PPM reading into a severity level */
export function classifySeverity(gasType: string, ppm: number): 'low' | 'medium' | 'high' {
  const thresholds = SEVERITY_THRESHOLDS[gasType];
  if (!thresholds) return ppm > 100 ? 'high' : ppm > 30 ? 'medium' : 'low';
  if (ppm >= thresholds.high) return 'high';
  if (ppm >= thresholds.medium) return 'medium';
  return 'low';
}

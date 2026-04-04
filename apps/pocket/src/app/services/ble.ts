/**
 * BLE service for connecting to the Arduino Nicla Sense ME.
 *
 * The Nicla exposes sensor data over BLE. The exact service/characteristic
 * UUIDs will be defined once the Arduino sketch is finalized — update the
 * constants below to match.
 *
 * For now this provides:
 *  - Scanning for nearby Nicla devices
 *  - Connecting and subscribing to notifications
 *  - Parsing incoming BLE data into SensorPayload
 *  - A mock mode for development without hardware
 */

import type { SensorPayload } from '@org/shared';

// ─── BLE UUIDs (update these once the Arduino sketch is finalized) ───
// The Nicla Sense ME typically advertises a custom service.
// These are placeholders — replace with the actual UUIDs from your sketch.
export const NICLA_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
export const NICLA_SENSOR_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
export const NICLA_DEVICE_NAME_PREFIX = 'Nicla';

// ─── Types ───

export type BleDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
};

export type BleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type BleEvent =
  | { type: 'status'; status: BleStatus; error?: string }
  | { type: 'device'; device: BleDevice }
  | { type: 'data'; payload: SensorPayload };

export type BleListener = (event: BleEvent) => void;

// ─── Mock BLE (for development without hardware) ───

const MOCK_GAS_TYPES = ['CO', 'H2S', 'CH4', 'VOC'];

function randomMockPayload(): SensorPayload {
  const gasType = MOCK_GAS_TYPES[Math.floor(Math.random() * MOCK_GAS_TYPES.length)];
  return {
    gasType,
    ppm: Math.round(Math.random() * 400),
    temperature: 20 + Math.random() * 15,
    humidity: 30 + Math.random() * 50,
    pressure: 1000 + Math.random() * 30,
    gasResistance: 10000 + Math.random() * 90000,
    iaq: Math.round(Math.random() * 500),
  };
}

// ─── BLE Manager ───

class BleManager {
  private listeners: Set<BleListener> = new Set();
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private _status: BleStatus = 'idle';
  private _connectedDevice: BleDevice | null = null;

  get status() { return this._status; }
  get connectedDevice() { return this._connectedDevice; }

  subscribe(listener: BleListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: BleEvent) {
    this.listeners.forEach((fn) => fn(event));
  }

  private setStatus(status: BleStatus, error?: string) {
    this._status = status;
    this.emit({ type: 'status', status, error });
  }

  /**
   * Start scanning for Nicla devices.
   * In mock mode, simulates finding a device after a short delay.
   */
  async startScan(mock = false) {
    this.setStatus('scanning');

    if (mock) {
      // Simulate discovering a device
      setTimeout(() => {
        this.emit({
          type: 'device',
          device: { id: 'mock-nicla-001', name: 'NiclaSenseME-Mock', rssi: -45 },
        });
      }, 1500);
      return;
    }

    // Real BLE scanning will go here once react-native-ble-plx is integrated.
    // The library requires a development build (not Expo Go).
    //
    // Example (uncomment when ready):
    // const manager = new BleManagerPLX();
    // manager.startDeviceScan([NICLA_SERVICE_UUID], null, (error, device) => {
    //   if (device?.name?.startsWith(NICLA_DEVICE_NAME_PREFIX)) {
    //     this.emit({ type: 'device', device: { id: device.id, name: device.name, rssi: device.rssi } });
    //   }
    // });
    this.setStatus('error', 'Real BLE not yet integrated — use mock mode');
  }

  stopScan() {
    this.setStatus('idle');
  }

  /**
   * Connect to a discovered device and start receiving data.
   * In mock mode, simulates sensor readings every 3 seconds.
   */
  async connect(device: BleDevice, mock = false) {
    this.setStatus('connecting');

    if (mock) {
      await new Promise((r) => setTimeout(r, 1000));
      this._connectedDevice = device;
      this.setStatus('connected');

      // Simulate incoming sensor data
      this.mockInterval = setInterval(() => {
        this.emit({ type: 'data', payload: randomMockPayload() });
      }, 3000);
      return;
    }

    // Real BLE connection will go here.
    // Steps:
    // 1. Connect to device
    // 2. Discover services
    // 3. Subscribe to NICLA_SENSOR_CHAR_UUID notifications
    // 4. Parse incoming data and emit 'data' events
    this.setStatus('error', 'Real BLE not yet integrated — use mock mode');
  }

  disconnect() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    this._connectedDevice = null;
    this.setStatus('disconnected');
  }
}

export const bleManager = new BleManager();

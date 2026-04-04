import { useEffect, useState, useCallback, useRef } from 'react';
import type { SensorPayload } from '@org/shared';
import { classifySeverity } from '@org/shared';
import { bleManager, type BleDevice, type BleStatus } from '../services/ble';
import { apiService } from '../services/api';

export type LiveReading = SensorPayload & {
  id: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
};

export function useBle() {
  const [status, setStatus] = useState<BleStatus>(bleManager.status);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [readings, setReadings] = useState<LiveReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const readingCounter = useRef(0);

  // GPS coords from phone — in a real app, use expo-location
  const locationRef = useRef({ lat: 41.7004, lng: -73.9209 });

  useEffect(() => {
    const unsub = bleManager.subscribe((event) => {
      switch (event.type) {
        case 'status':
          setStatus(event.status);
          setError(event.error || null);
          if (event.status === 'connected') {
            setConnectedDevice(bleManager.connectedDevice);
          }
          if (event.status === 'disconnected') {
            setConnectedDevice(null);
          }
          break;

        case 'device':
          setDevices((prev) => {
            if (prev.some((d) => d.id === event.device.id)) return prev;
            return [...prev, event.device];
          });
          break;

        case 'data': {
          const id = `r-${Date.now()}-${readingCounter.current++}`;
          const severity = classifySeverity(event.payload.gasType, event.payload.ppm);
          const reading: LiveReading = {
            ...event.payload,
            id,
            severity,
            timestamp: new Date().toISOString(),
          };

          setReadings((prev) => [reading, ...prev].slice(0, 100));

          // Relay to dashboard
          apiService.enqueue({
            id,
            lat: locationRef.current.lat,
            lng: locationRef.current.lng,
            gasType: reading.gasType,
            ppm: reading.ppm,
            severity: reading.severity,
            timestamp: reading.timestamp,
            raw: {
              temperature: reading.temperature,
              humidity: reading.humidity,
              pressure: reading.pressure,
              gasResistance: reading.gasResistance,
              iaq: reading.iaq,
            },
          });
          break;
        }
      }
    });

    return unsub;
  }, []);

  const scan = useCallback((mock = true) => {
    setDevices([]);
    setError(null);
    bleManager.startScan(mock);
  }, []);

  const connect = useCallback((device: BleDevice, mock = true) => {
    bleManager.connect(device, mock);
  }, []);

  const disconnect = useCallback(() => {
    bleManager.disconnect();
  }, []);

  return {
    status,
    devices,
    connectedDevice,
    readings,
    error,
    scan,
    connect,
    disconnect,
  };
}

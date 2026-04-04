'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import { classifySeverity } from '@org/shared';
import type { GasReading } from '../data/mock-readings';

// ─── Nicla Sense ME BLE UUIDs (update when Arduino sketch is finalized) ───
const NICLA_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const NICLA_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';

export type BleStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'unsupported';

// ─── Mock data generator ───
const MOCK_GAS = ['CO', 'H2S', 'CH4', 'VOC'];
function mockReading(counter: number): GasReading {
  const gasType = MOCK_GAS[Math.floor(Math.random() * MOCK_GAS.length)];
  const ppm = Math.round(Math.random() * 400);
  return {
    id: `ble-${Date.now()}-${counter}`,
    lat: 41.7004 + (Math.random() - 0.5) * 0.05,
    lng: -73.9209 + (Math.random() - 0.5) * 0.05,
    gasType,
    ppm,
    severity: classifySeverity(gasType, ppm),
    timestamp: new Date().toISOString(),
  };
}

export function useWebBle() {
  const [status, setStatus] = useState<BleStatus>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [bleReadings, setBleReadings] = useState<GasReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceRef = useRef<any>(null);

  // Check browser support
  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, []);

  // ─── Real BLE connect ───
  const connectReal = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported');
      setError('Web Bluetooth not supported in this browser. Use Chrome on Android or laptop.');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'Nicla' }],
        optionalServices: [NICLA_SERVICE_UUID],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Nicla Device');

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDeviceName(null);
      });

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(NICLA_SERVICE_UUID);
      const char = await service.getCharacteristic(NICLA_CHAR_UUID);

      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target?.value;
        if (!value) return;

        // Parse the incoming BLE data — adjust this once the Arduino format is known
        // For now, assume a simple JSON string or structured bytes
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          const parsed = JSON.parse(text);
          const gasType = parsed.gasType || 'VOC';
          const ppm = parsed.ppm || 0;

          const reading: GasReading = {
            id: `ble-${Date.now()}-${counterRef.current++}`,
            lat: 41.7004,
            lng: -73.9209,
            gasType,
            ppm,
            severity: classifySeverity(gasType, ppm),
            timestamp: new Date().toISOString(),
          };
          setBleReadings((prev) => [reading, ...prev].slice(0, 200));
        } catch {
          // Binary format — adapt once known
          console.warn('Could not parse BLE data, raw bytes:', new Uint8Array(value.buffer));
        }
      });

      setStatus('connected');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotFoundError') {
        // User cancelled the device picker
        setStatus('idle');
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [isSupported]);

  // ─── Mock BLE connect (for demo / development) ───
  const connectMock = useCallback(() => {
    setStatus('connected');
    setDeviceName('NiclaSenseME-Mock');
    setError(null);

    mockIntervalRef.current = setInterval(() => {
      const reading = mockReading(counterRef.current++);
      setBleReadings((prev) => [reading, ...prev].slice(0, 200));
    }, 3000);
  }, []);

  // ─── Disconnect ───
  const disconnect = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    setStatus('disconnected');
    setDeviceName(null);
  }, []);

  return {
    status,
    deviceName,
    bleReadings,
    error,
    isSupported,
    connectReal,
    connectMock,
    disconnect,
  };
}

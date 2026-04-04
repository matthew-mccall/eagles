/**
 * API service for relaying readings from the mobile app to the dashboard.
 *
 * The readings are POSTed to /api/readings which stores them in Supabase
 * (with an in-memory fallback if the table isn't set up yet).
 */

import { Platform } from 'react-native';
import type { GasReading, ReadingBatch } from '@org/shared';

// Android emulator uses 10.0.2.2 to reach host; iOS sim uses localhost
const DEFAULT_API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

class ApiService {
  private _baseUrl: string = DEFAULT_API_URL;
  private _queue: GasReading[] = [];
  private _sending = false;
  private _deviceId: string = `pocket-${Date.now().toString(36)}`;
  private _lastError: string | null = null;
  private _successCount = 0;
  private _errorCount = 0;

  get baseUrl() { return this._baseUrl; }
  get deviceId() { return this._deviceId; }
  get queueLength() { return this._queue.length; }
  get lastError() { return this._lastError; }
  get successCount() { return this._successCount; }
  get errorCount() { return this._errorCount; }

  /** Set a custom base URL (e.g. for production or LAN testing) */
  setBaseUrl(url: string) {
    this._baseUrl = url.replace(/\/$/, '');
  }

  /** Queue a reading to be sent to the dashboard */
  enqueue(reading: GasReading) {
    this._queue.push(reading);
    this.flush();
  }

  /** Send all queued readings to the dashboard */
  async flush(): Promise<boolean> {
    if (this._sending || this._queue.length === 0) return true;
    this._sending = true;

    const batch = this._queue.splice(0, this._queue.length);
    const body: ReadingBatch = {
      deviceId: this._deviceId,
      readings: batch,
    };

    try {
      const res = await fetch(`${this._baseUrl}/api/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this._successCount += batch.length;
      this._lastError = null;
      this._sending = false;
      return true;
    } catch (err: unknown) {
      // Put readings back in queue for retry
      this._queue.unshift(...batch);
      this._errorCount++;
      this._lastError = err instanceof Error ? err.message : 'Unknown error';
      this._sending = false;
      return false;
    }
  }
}

export const apiService = new ApiService();

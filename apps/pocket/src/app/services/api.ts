/**
 * API service for relaying readings from the mobile app to the dashboard.
 */

import type { GasReading, ReadingBatch } from '@org/shared';

// Default to local dev — in production this would be a real URL
const DEFAULT_API_URL = 'http://10.0.2.2:3000'; // Android emulator -> host
const IOS_API_URL = 'http://localhost:3000';

export type RelayStatus = 'idle' | 'sending' | 'success' | 'error';

class ApiService {
  private _baseUrl: string;
  private _queue: GasReading[] = [];
  private _sending = false;
  private _deviceId: string;
  private _lastError: string | null = null;
  private _successCount = 0;
  private _errorCount = 0;

  constructor() {
    // Detect platform — React Native doesn't have window.navigator in the same way
    this._baseUrl = DEFAULT_API_URL;
    this._deviceId = `pocket-${Date.now().toString(36)}`;
  }

  get baseUrl() { return this._baseUrl; }
  get deviceId() { return this._deviceId; }
  get queueLength() { return this._queue.length; }
  get lastError() { return this._lastError; }
  get successCount() { return this._successCount; }
  get errorCount() { return this._errorCount; }

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

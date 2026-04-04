import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useBle, type LiveReading } from './hooks/useBle';
import type { BleDevice } from './services/ble';
import { apiService } from './services/api';

// ─── Colors ───

const BRAND = '#F27523';
const SEV = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const GAS_COLORS: Record<string, string> = {
  CO: '#0ea5e9', H2S: '#f97316', CH4: '#8b5cf6', VOC: '#ec4899',
};

// ─── Helpers ───

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Main App ───

export const App = () => {
  const ble = useBle();
  const isConnected = ble.status === 'connected';

  // Filters (mirrors dashboard sidebar)
  const [activeGas, setActiveGas] = useState<Set<string>>(new Set(['CO', 'H2S', 'CH4', 'VOC']));
  const [activeSev, setActiveSev] = useState<Set<string>>(new Set(['high', 'medium', 'low']));

  const toggleGas = (g: string) => setActiveGas((prev) => {
    const next = new Set(prev);
    next.has(g) ? next.delete(g) : next.add(g);
    return next;
  });

  const toggleSev = (s: string) => setActiveSev((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const filtered = useMemo(
    () => ble.readings.filter((r) => activeGas.has(r.gasType) && activeSev.has(r.severity)),
    [ble.readings, activeGas, activeSev],
  );

  // Stats (same as dashboard StatsCards)
  const stats = useMemo(() => {
    const total = filtered.length;
    const high = filtered.filter((r) => r.severity === 'high').length;
    const medium = filtered.filter((r) => r.severity === 'medium').length;
    const low = filtered.filter((r) => r.severity === 'low').length;
    const avgPpm = total > 0 ? Math.round(filtered.reduce((s, r) => s + r.ppm, 0) / total) : 0;
    const maxPpm = total > 0 ? Math.max(...filtered.map((r) => r.ppm)) : 0;
    return { total, high, medium, low, avgPpm, maxPpm };
  }, [filtered]);

  // Gas breakdown
  const gasBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of filtered) counts[r.gasType] = (counts[r.gasType] || 0) + 1;
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Hazard Watch</Text>
          <Text style={styles.headerSub}>Field Sensor</Text>
        </View>
        <ConnectionChip
          status={ble.status}
          device={ble.connectedDevice}
          onScan={() => ble.scan(true)}
          onConnect={(d) => ble.connect(d, true)}
          onDisconnect={ble.disconnect}
          devices={ble.devices}
          error={ble.error}
        />
      </View>

      {/* ── High alert banner ── */}
      {isConnected && stats.high > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            {stats.high} HIGH SEVERITY ALERT{stats.high > 1 ? 'S' : ''}
          </Text>
        </View>
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        {/* ── Filters ── */}
        <Text style={styles.sectionLabel}>FILTERS</Text>
        <View style={styles.filterRow}>
          {['CO', 'H2S', 'CH4', 'VOC'].map((g) => {
            const on = activeGas.has(g);
            return (
              <TouchableOpacity
                key={g}
                onPress={() => toggleGas(g)}
                style={[styles.chip, on && { backgroundColor: GAS_COLORS[g] + '20', borderColor: GAS_COLORS[g] }]}
              >
                <View style={[styles.chipDot, { backgroundColor: on ? GAS_COLORS[g] : '#d1d5db' }]} />
                <Text style={[styles.chipText, on && { color: GAS_COLORS[g] }]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.filterRow}>
          {(['high', 'medium', 'low'] as const).map((s) => {
            const on = activeSev.has(s);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => toggleSev(s)}
                style={[styles.chip, on && { backgroundColor: SEV[s] + '20', borderColor: SEV[s] }]}
              >
                <View style={[styles.chipDot, { backgroundColor: on ? SEV[s] : '#d1d5db' }]} />
                <Text style={[styles.chipText, on && { color: SEV[s] }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Statistics ── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>STATISTICS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={stats.total} color={BRAND} />
          <StatCard label="High" value={stats.high} color={SEV.high} />
          <StatCard label="Medium" value={stats.medium} color={SEV.medium} />
          <StatCard label="Low" value={stats.low} color={SEV.low} />
          <StatCard label="Avg PPM" value={stats.avgPpm} color="#8b5cf6" />
          <StatCard label="Max PPM" value={stats.maxPpm} color={SEV.high} />
        </View>

        {/* ── Gas Breakdown ── */}
        {gasBreakdown.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>GAS BREAKDOWN</Text>
            {gasBreakdown.map(([gas, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <View key={gas} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabel}>
                    <Text style={styles.breakdownGas}>{gas}</Text>
                    <Text style={styles.breakdownCount}>{count} ({pct}%)</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: GAS_COLORS[gas] || BRAND }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Recent Readings ── */}
        <View style={styles.readingsHeaderRow}>
          <Text style={styles.sectionLabel}>RECENT READINGS</Text>
          <Text style={styles.readingsCount}>
            {filtered.length !== ble.readings.length
              ? `${filtered.length} / ${ble.readings.length}`
              : `${filtered.length} total`}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {!isConnected ? 'Not connected' : 'No readings match'}
            </Text>
            <Text style={styles.emptySub}>
              {!isConnected
                ? 'Tap the status chip above to scan for your Nicla device'
                : 'Adjust your filters or wait for new data'}
            </Text>
          </View>
        ) : (
          filtered.map((r) => <ReadingCard key={r.id} item={r} />)
        )}

        {/* ── Relay status ── */}
        {isConnected && (
          <View style={styles.relayCard}>
            <Text style={styles.relayLabel}>DASHBOARD RELAY</Text>
            <View style={styles.relayStats}>
              <Text style={styles.relayStat}>Sent: {apiService.successCount}</Text>
              <Text style={styles.relayStat}>Queued: {apiService.queueLength}</Text>
              {apiService.lastError && (
                <Text style={[styles.relayStat, { color: SEV.high }]}>Error: {apiService.lastError}</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Connection Chip (compact header control) ───

function ConnectionChip({
  status, device, devices, error, onScan, onConnect, onDisconnect,
}: {
  status: string;
  device: BleDevice | null;
  devices: BleDevice[];
  error: string | null;
  onScan: () => void;
  onConnect: (d: BleDevice) => void;
  onDisconnect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (status === 'connected') {
    return (
      <TouchableOpacity style={[styles.connChip, { backgroundColor: '#22c55e' }]} onPress={onDisconnect}>
        <View style={styles.connDot} />
        <Text style={styles.connText} numberOfLines={1}>{device?.name || 'Connected'}</Text>
      </TouchableOpacity>
    );
  }

  if (!expanded) {
    return (
      <TouchableOpacity
        style={[styles.connChip, { backgroundColor: status === 'scanning' ? '#3b82f6' : '#6b7280' }]}
        onPress={() => { setExpanded(true); onScan(); }}
      >
        <Text style={styles.connText}>{status === 'scanning' ? 'Scanning...' : 'Connect'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.connDropdown}>
      <TouchableOpacity onPress={() => setExpanded(false)} style={styles.connDropdownClose}>
        <Text style={{ color: '#6b7280', fontSize: 12 }}>Close</Text>
      </TouchableOpacity>
      {status === 'scanning' && <Text style={styles.connDropdownHint}>Scanning...</Text>}
      {error && <Text style={[styles.connDropdownHint, { color: SEV.high }]}>{error}</Text>}
      {devices.map((d) => (
        <TouchableOpacity
          key={d.id}
          style={styles.connDevice}
          onPress={() => { onConnect(d); setExpanded(false); }}
        >
          <Text style={styles.connDeviceName}>{d.name || 'Unknown'}</Text>
          {d.rssi != null && <Text style={styles.connDeviceRssi}>{d.rssi} dBm</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Reading Card ───

function ReadingCard({ item }: { item: LiveReading }) {
  const color = SEV[item.severity];
  return (
    <View style={styles.readingCard}>
      <View style={[styles.readingDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.readingTop}>
          <Text style={styles.readingGas}>{item.gasType}</Text>
          <Text style={[styles.readingSev, { color }]}>{item.severity.toUpperCase()}</Text>
        </View>
        <View style={styles.readingBottom}>
          <Text style={styles.readingPpm}>{item.ppm} ppm</Text>
          <Text style={styles.readingTime}>{relativeTime(item.timestamp)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },

  // Header
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },

  // Alert
  alertBanner: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16 },
  alertText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16 },

  // Section labels
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // Filter chips
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Gas breakdown
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  breakdownTitle: { fontSize: 10, fontWeight: '600', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 },
  breakdownRow: { marginBottom: 8 },
  breakdownLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  breakdownGas: { fontSize: 13, fontWeight: '600', color: '#374151' },
  breakdownCount: { fontSize: 12, color: '#9ca3af' },
  barTrack: { height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  // Readings header
  readingsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  readingsCount: { fontSize: 10, color: '#9ca3af' },

  // Reading card
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  readingDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  readingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readingGas: { fontSize: 14, fontWeight: '600', color: '#111827' },
  readingSev: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  readingBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  readingPpm: { fontSize: 12, color: '#6b7280', fontFamily: 'Courier New' },
  readingTime: { fontSize: 11, color: '#9ca3af' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  emptySub: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },

  // Relay
  relayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  relayLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', letterSpacing: 1, marginBottom: 6 },
  relayStats: { flexDirection: 'row', gap: 16 },
  relayStat: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  // Connection chip
  connChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  connDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  connText: { color: '#fff', fontSize: 12, fontWeight: '600', maxWidth: 120 },

  // Connection dropdown
  connDropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  connDropdownClose: { alignItems: 'flex-end', marginBottom: 4 },
  connDropdownHint: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  connDevice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  connDeviceName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  connDeviceRssi: { fontSize: 11, color: '#9ca3af' },
});

export default App;

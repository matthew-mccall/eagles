'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { MapViewMode } from '../components/HazardMap';
import { mockReadings } from '../data/mock-readings';
import StatsCards from '../components/StatsCards';
import ReadingsTable from '../components/ReadingsTable';
import FilterBar from '../components/FilterBar';
import type { Filters } from '../components/FilterBar';

const HazardMap = dynamic(() => import('../components/HazardMap'), { ssr: false });

type LayoutMode = 'full' | 'dashboard';

const modes: { key: MapViewMode; label: string; shortcut: string }[] = [
  { key: 'clusters', label: 'Potential Leaks', shortcut: '1' },
  { key: 'heatmap', label: 'Heat Map', shortcut: '2' },
  { key: 'tracking', label: 'Live Tracking', shortcut: '3' },
];

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 300;

const DEFAULT_FILTERS: Filters = {
  gasTypes: ['CO', 'H2S', 'CH4'],
  severities: ['high', 'medium', 'low'],
  search: '',
};

export default function DashboardPage() {
  const [activeMode, setActiveMode] = useState<MapViewMode>('clusters');
  const [layout, setLayout] = useState<LayoutMode>('dashboard');
  const [dark, setDark] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedReading, setSelectedReading] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Client-only time to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
    const id = setInterval(() => setLastUpdated(new Date().toLocaleTimeString()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1': setActiveMode('clusters'); break;
        case '2': setActiveMode('heatmap'); break;
        case '3': setActiveMode('tracking'); break;
        case 'd': case 'D': setDark((v) => !v); break;
        case 'f': case 'F': setLayout((v) => v === 'full' ? 'dashboard' : 'full'); break;
        case 'b': case 'B': setSidebarCollapsed((v) => !v); break;
        case '?': setShowShortcuts((v) => !v); break;
        case 'Escape':
          setSelectedReading(null);
          setShowShortcuts(false);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Sidebar resize drag handler
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - startX;
      setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const filteredReadings = useMemo(() => {
    return mockReadings.filter((r) => {
      if (!filters.gasTypes.includes(r.gasType)) return false;
      if (!filters.severities.includes(r.severity)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          r.gasType.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          String(r.ppm).includes(q)
        );
      }
      return true;
    });
  }, [filters]);

  const highAlerts = filteredReadings.filter((r) => r.severity === 'high');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-brand dark:bg-gray-900 border-b border-brand-600 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dark ? '/images/logo.png' : '/images/logo-white.png'}
            alt="Hazard Watch"
            width={52}
            height={52}
            className="object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none text-white dark:text-white">Hazard Watch</h1>
            <p className="text-[10px] text-white/70 dark:text-gray-500 mt-0.5">Gas Detection Dashboard</p>
          </div>
        </div>

        {/* Center: Mode tabs */}
        <nav className="flex gap-0.5 bg-white/20 dark:bg-gray-800 rounded-lg p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMode(m.key)}
              title={`${m.label} (${m.shortcut})`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeMode === m.key
                  ? 'bg-white text-brand-700 dark:bg-brand dark:text-white shadow-lg'
                  : 'text-white/70 hover:text-white dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/10 dark:hover:bg-gray-700/50'
              }`}
            >
              {m.label}
              <kbd className="ml-1.5 text-[9px] opacity-50 font-mono">{m.shortcut}</kbd>
            </button>
          ))}
        </nav>

        {/* Right: controls */}
        <div className="flex items-center gap-3">
          {highAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-400/30 rounded-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-red-100 dark:text-red-400 font-medium">{highAlerts.length} Alert{highAlerts.length > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Keyboard shortcuts help */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-1.5 rounded-md text-white/70 hover:text-white dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-mono font-bold"
            title="Keyboard shortcuts (?)"
          >?</button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-md text-white/70 hover:text-white dark:text-gray-400 dark:hover:text-white transition-colors"
            title={dark ? 'Switch to light mode (D)' : 'Switch to dark mode (D)'}
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {/* Layout toggle */}
          <div className="flex bg-white/20 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setLayout('dashboard')}
              title="Dashboard view (F)"
              className={`p-1.5 rounded-md transition-all ${layout === 'dashboard' ? 'bg-white text-brand-700 dark:bg-gray-700 dark:text-white' : 'text-white/60 dark:text-gray-500 hover:text-white dark:hover:text-gray-300'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2}/>
                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2}/>
                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2}/>
                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2}/>
              </svg>
            </button>
            <button
              onClick={() => setLayout('full')}
              title="Full map view (F)"
              className={`p-1.5 rounded-md transition-all ${layout === 'full' ? 'bg-white text-brand-700 dark:bg-gray-700 dark:text-white' : 'text-white/60 dark:text-gray-500 hover:text-white dark:hover:text-gray-300'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content area */}
      {layout === 'full' ? (
        <main className="flex-1 relative">
          <HazardMap mode={activeMode} readings={filteredReadings} />
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden">
          {/* Collapsible sidebar */}
          {!sidebarCollapsed && (
            <aside
              className="shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50 overflow-hidden relative select-none"
              style={{ width: sidebarWidth }}
            >
              {/* Filters section — collapsible */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center justify-between w-full px-3 pt-2.5 pb-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium hover:text-brand transition-colors"
              >
                <span>Filters</span>
                <svg className={`w-3 h-3 transition-transform ${filtersOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {filtersOpen && (
                <div className="px-3 pb-3 border-b border-gray-200 dark:border-gray-800">
                  <FilterBar filters={filters} onChange={setFilters} defaultFilters={DEFAULT_FILTERS} />
                </div>
              )}

              {/* Stats section — collapsible */}
              <button
                onClick={() => setStatsOpen(!statsOpen)}
                className="flex items-center justify-between w-full px-3 pt-2.5 pb-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium hover:text-brand transition-colors"
              >
                <span>Statistics</span>
                <svg className={`w-3 h-3 transition-transform ${statsOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {statsOpen && (
                <div className="px-3 pb-3 border-b border-gray-200 dark:border-gray-800">
                  <StatsCards readings={filteredReadings} />
                </div>
              )}

              {/* Readings table — always visible, fills remaining space */}
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Recent Readings</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  {filteredReadings.length !== mockReadings.length
                    ? `${filteredReadings.length} / ${mockReadings.length}`
                    : `${filteredReadings.length} total`}
                </span>
              </div>
              <div className="flex-1 overflow-auto px-1">
                {filteredReadings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No readings match</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters</p>
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="mt-3 text-xs text-brand hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
                    >
                      Reset all filters
                    </button>
                  </div>
                ) : (
                  <ReadingsTable
                    readings={filteredReadings}
                    selectedId={selectedReading}
                    onSelect={(r) => setSelectedReading(r.id === selectedReading ? null : r.id)}
                  />
                )}
              </div>

              {/* Drag handle for resizing */}
              <div
                onMouseDown={startResize}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 flex items-center justify-center"
              >
                <div className="w-0.5 h-8 rounded-full bg-gray-300 dark:bg-gray-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:bg-brand transition-opacity" />
              </div>
            </aside>
          )}

          {/* Sidebar toggle (visible when collapsed) */}
          <div className="relative">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-3 left-1 z-20 p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-brand shadow-sm transition-colors"
              title={sidebarCollapsed ? 'Show sidebar (B)' : 'Hide sidebar (B)'}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Map area */}
          <div className="flex-1 relative">
            <HazardMap mode={activeMode} readings={filteredReadings} />
            <div className="absolute top-3 left-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-gray-600 dark:text-gray-400 flex items-center gap-2 border border-gray-200 dark:border-gray-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Last updated: {lastUpdated || '—'}
            </div>
          </div>
        </main>
      )}
      {/* Keyboard shortcuts help overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['1 / 2 / 3', 'Switch map mode'],
                ['D', 'Toggle dark mode'],
                ['F', 'Toggle full map / dashboard'],
                ['B', 'Toggle sidebar'],
                ['Esc', 'Deselect / close'],
                ['?', 'Show this help'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-gray-600 dark:text-gray-300">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[11px] border border-gray-200 dark:border-gray-700">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

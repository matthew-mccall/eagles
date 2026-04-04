'use client';

import { useEffect, useRef, useState } from 'react';
import type { GasReading } from '../data/mock-readings';

type SortKey = 'gasType' | 'ppm' | 'severity' | 'timestamp';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function severityBadge(severity: string) {
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  };
  return styles[severity] || 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
}

function sortReadings(readings: GasReading[], key: SortKey, dir: SortDir): GasReading[] {
  const sorted = [...readings].sort((a, b) => {
    switch (key) {
      case 'gasType': return a.gasType.localeCompare(b.gasType);
      case 'ppm': return a.ppm - b.ppm;
      case 'severity': return (SEVERITY_ORDER[a.severity] || 0) - (SEVERITY_ORDER[b.severity] || 0);
      case 'timestamp': return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      default: return 0;
    }
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

const COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: 'gasType', label: 'Gas', align: 'text-left' },
  { key: 'ppm', label: 'PPM', align: 'text-right' },
  { key: 'severity', label: 'Level', align: 'text-center' },
  { key: 'timestamp', label: 'Time', align: 'text-right' },
];

export default function ReadingsTable({
  readings,
  onSelect,
  selectedId,
}: {
  readings: GasReading[];
  onSelect?: (reading: GasReading) => void;
  selectedId?: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const selectedRef = useRef<HTMLTableRowElement>(null);

  const sorted = sortReadings(readings, sortKey, sortDir);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'ppm' || key === 'severity' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="overflow-auto max-h-full">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`${col.align} py-2 px-2 font-medium cursor-pointer select-none hover:text-brand dark:hover:text-brand-400 transition-colors`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {col.label}
                  {sortKey === col.key && (
                    <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              ref={selectedId === r.id ? selectedRef : undefined}
              onClick={() => onSelect?.(r)}
              className={`border-b border-gray-100 dark:border-gray-800/50 cursor-pointer transition-colors hover:bg-brand-50 dark:hover:bg-gray-800/50 ${
                selectedId === r.id ? 'bg-brand-50 dark:bg-gray-800 ring-1 ring-brand/30 dark:ring-brand/20' : ''
              }`}
            >
              <td className="py-1.5 px-2 font-mono font-medium text-gray-800 dark:text-gray-200">{r.gasType}</td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-600 dark:text-gray-300">{r.ppm}</td>
              <td className="py-1.5 px-2 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${severityBadge(r.severity)}`}>
                  {r.severity}
                </span>
              </td>
              <td className="py-1.5 px-2 text-right text-gray-400 dark:text-gray-500" title={new Date(r.timestamp).toLocaleString()}>
                {relativeTime(r.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

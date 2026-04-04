'use client';

import type { GasReading } from '../data/mock-readings';

function countBy<T>(arr: T[], fn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const key = fn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

export default function StatsCards({ readings }: { readings: GasReading[] }) {
  const total = readings.length;
  const highCount = readings.filter((r) => r.severity === 'high').length;
  const mediumCount = readings.filter((r) => r.severity === 'medium').length;
  const lowCount = readings.filter((r) => r.severity === 'low').length;
  const avgPpm = total > 0 ? Math.round(readings.reduce((s, r) => s + r.ppm, 0) / total) : 0;
  const maxPpm = total > 0 ? Math.max(...readings.map((r) => r.ppm)) : 0;
  const gasCounts = countBy(readings, (r) => r.gasType);

  const cards = [
    { label: 'Total Readings', value: total, color: 'text-brand dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: 'High Severity', value: highCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
    { label: 'Medium Severity', value: mediumCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Low Severity', value: lowCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Avg PPM', value: avgPpm, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Max PPM', value: maxPpm, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
  ];

  return (
    <div className="space-y-3">
      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className={`${c.bg} rounded-lg p-3 text-center`}>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Gas type breakdown */}
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Gas Breakdown</div>
        <div className="space-y-2">
          {Object.entries(gasCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([gas, count]) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={gas}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{gas}</span>
                    <span className="text-gray-400 dark:text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

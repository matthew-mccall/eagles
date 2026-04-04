'use client';

const ALL_GAS_TYPES = ['CO', 'H2S', 'CH4'];
const ALL_SEVERITIES = ['high', 'medium', 'low'] as const;

export type Filters = {
  gasTypes: string[];
  severities: string[];
  search: string;
};

export default function FilterBar({
  filters,
  onChange,
  defaultFilters,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  defaultFilters?: Filters;
}) {
  const isFiltered = defaultFilters && (
    filters.gasTypes.length !== defaultFilters.gasTypes.length ||
    filters.severities.length !== defaultFilters.severities.length ||
    filters.search !== defaultFilters.search
  );
  const toggleGas = (g: string) => {
    const next = filters.gasTypes.includes(g)
      ? filters.gasTypes.filter((x) => x !== g)
      : [...filters.gasTypes, g];
    onChange({ ...filters, gasTypes: next });
  };

  const toggleSeverity = (s: string) => {
    const next = filters.severities.includes(s)
      ? filters.severities.filter((x) => x !== s)
      : [...filters.severities, s];
    onChange({ ...filters, severities: next });
  };

  const gasColors: Record<string, string> = {
    CO: 'bg-sky-500',
    H2S: 'bg-brand',
    CH4: 'bg-violet-500',
  };

  const sevColors: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search readings..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 pl-8 border border-gray-300 dark:border-gray-700 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-500"
        />
        <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Gas type toggles */}
      <div>
        <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Gas Type</div>
        <div className="flex gap-1.5">
          {ALL_GAS_TYPES.map((g) => {
            const active = filters.gasTypes.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGas(g)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-gray-700 dark:text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700 dark:bg-gray-800/50 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? gasColors[g] : 'bg-gray-300 dark:bg-gray-600'}`} />
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity toggles */}
      <div>
        <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Severity</div>
        <div className="flex gap-1.5">
          {ALL_SEVERITIES.map((s) => {
            const active = filters.severities.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSeverity(s)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-gray-700 dark:text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700 dark:bg-gray-800/50 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? sevColors[s] : 'bg-gray-300 dark:bg-gray-600'}`} />
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset filters */}
      {isFiltered && defaultFilters && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="w-full text-center text-[11px] text-brand hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium py-1.5 rounded-md hover:bg-brand-50 dark:hover:bg-gray-800 transition-colors"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

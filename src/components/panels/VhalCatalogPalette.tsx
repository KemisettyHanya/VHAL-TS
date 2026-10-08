import React from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { AOSP_VHAL_CATALOG } from '../../parsers/aospCatalog';
import { VhalDomain } from '../../types/automotive';
import { Search, Plus, Layers } from 'lucide-react';

const DOMAINS: (VhalDomain | 'ALL')[] = [
  'ALL',
  'Dynamics',
  'Powertrain',
  'HVAC',
  'Body',
  'Electrification',
  'Chassis',
  'Sensors',
];

export const VhalCatalogPalette: React.FC = () => {
  const {
    searchVhal,
    setSearchVhal,
    selectedDomain,
    setSelectedDomain,
    activeVhalNodeIds,
    addVhalNodeToCanvas,
  } = useVhalStore();

  const filteredProperties = React.useMemo(() => {
    const q = searchVhal.trim().toLowerCase();

    return AOSP_VHAL_CATALOG.filter((prop) => {
      if (selectedDomain !== 'ALL' && prop.domain !== selectedDomain) {
        return false;
      }
      if (!q) return true;
      return (
        prop.name.toLowerCase().includes(q) ||
        prop.hexId.toLowerCase().includes(q) ||
        prop.description.toLowerCase().includes(q) ||
        prop.defaultUnit.toLowerCase().includes(q) ||
        prop.dataType.toLowerCase().includes(q)
      );
    });
  }, [searchVhal, selectedDomain]);

  return (
    <div className="w-80 h-full flex flex-col bg-white dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800/80 shrink-0 transition-colors duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              AOSP Properties ({filteredProperties.length})
            </span>
          </div>

          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/50 font-semibold">
            Android 13/14+ AIDL
          </span>
        </div>

        {/* Search input */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchVhal}
            onChange={(e) => setSearchVhal(e.target.value)}
            placeholder="Search AOSP property, AIDL ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {DOMAINS.map((domain) => {
            const isSelected = selectedDomain === domain;
            return (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {domain}
              </button>
            );
          })}
        </div>
      </div>

      {/* Property List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredProperties.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No properties found matching "{searchVhal}"
          </div>
        ) : (
          filteredProperties.map((prop) => {
            const isOnCanvas = activeVhalNodeIds.includes(prop.name);

            return (
              <div
                key={prop.name}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors group flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={prop.name}>
                      {prop.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{prop.hexId}</span>
                    <span>•</span>
                    <span>{prop.dataType.replace('Values', '')}</span>
                    {prop.defaultUnit && (
                      <>
                        <span>•</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">[{prop.defaultUnit}]</span>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate mt-1" title={prop.description}>
                    {prop.description}
                  </p>
                </div>

                <button
                  onClick={() => addVhalNodeToCanvas(prop.name)}
                  disabled={isOnCanvas}
                  title={isOnCanvas ? 'Already on canvas' : 'Add to canvas'}
                  className={`p-1.5 rounded transition-colors shrink-0 mt-0.5 ${
                    isOnCanvas
                      ? 'text-emerald-600/40 dark:text-emerald-500/50 bg-emerald-100/50 dark:bg-emerald-950/20 cursor-default'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

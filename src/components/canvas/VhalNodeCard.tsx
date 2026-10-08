import React from 'react';
import { VhalProperty } from '../../types/automotive';
import { Layers, X } from 'lucide-react';

interface VhalNodeCardProps {
  property: VhalProperty;
  isConnected: boolean;
  onRemove: () => void;
  onDropConnect: (propertyName: string) => void;
  registerPinRef?: (el: HTMLElement | null) => void;
}

export const VhalNodeCard: React.FC<VhalNodeCardProps> = ({
  property,
  isConnected,
  onRemove,
  onDropConnect,
  registerPinRef,
}) => {
  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'Dynamics':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800/50';
      case 'Powertrain':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/60 dark:border-amber-800/50';
      case 'HVAC':
        return 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/60 dark:border-sky-800/50';
      case 'Body':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/60 dark:border-indigo-800/50';
      case 'Electrification':
        return 'text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/60 dark:border-teal-800/50';
      case 'Chassis':
        return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/60 dark:border-orange-800/50';
      case 'Sensors':
        return 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/60 dark:border-violet-800/50';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-700';
    }
  };

  return (
    <div
      data-property-name={property.name}
      className={`relative group bg-white dark:bg-slate-900/90 border rounded-xl p-3.5 shadow-md transition-all duration-200 select-none ${
        isConnected
          ? 'border-emerald-500 shadow-emerald-100 dark:shadow-emerald-950/40 bg-gradient-to-l from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-900/95'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Input Terminal Pin */}
      <div
        ref={registerPinRef}
        data-pin-type="target"
        data-property-name={property.name}
        onMouseUp={() => onDropConnect(property.name)}
        title="Drop or click connection pin here"
        className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 z-20 ${
          isConnected
            ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 border-2 border-white dark:border-slate-950'
            : 'bg-slate-400 dark:bg-slate-700 hover:bg-emerald-500 border-2 border-white dark:border-slate-900 hover:scale-125'
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate font-mono" title={property.name}>
              {property.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
              AIDL ID: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{property.hexId}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onRemove}
          title="Remove from canvas"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`px-1.5 py-0.5 rounded border font-mono ${getDomainColor(property.domain)}`}>
          {property.domain}
        </span>

        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
          {property.dataType.replace('Values', '')}
        </span>

        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono">
          {property.areaType}
        </span>

        {property.defaultUnit && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 font-mono font-medium">
            {property.defaultUnit}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 truncate bg-slate-50 dark:bg-slate-950/60 rounded px-2 py-1 border border-slate-200 dark:border-slate-800/80" title={property.description}>
        {property.description}
      </p>
    </div>
  );
};

import React from 'react';
import { CanSignal } from '../../types/automotive';
import { Cpu, X } from 'lucide-react';

interface CanNodeCardProps {
  signal: CanSignal;
  isConnected: boolean;
  onRemove: () => void;
  onStartConnect: (e: React.MouseEvent, signalId: string) => void;
  registerPinRef?: (el: HTMLElement | null) => void;
}

export const CanNodeCard: React.FC<CanNodeCardProps> = ({
  signal,
  isConnected,
  onRemove,
  onStartConnect,
  registerPinRef,
}) => {
  return (
    <div
      data-signal-id={signal.id}
      className={`relative group bg-white dark:bg-slate-900/90 border rounded-xl p-3.5 shadow-md transition-all duration-200 select-none ${
        isConnected
          ? 'border-cyan-500 shadow-cyan-100 dark:shadow-cyan-950/40 bg-gradient-to-r from-cyan-50/40 to-white dark:from-slate-900 dark:to-slate-900/95'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate font-mono" title={signal.name}>
              {signal.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {signal.messageName} <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">0x{signal.messageId.toString(16).toUpperCase()}</span>
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
        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
          Bit {signal.startBit}:{signal.length}b
        </span>

        <span
          className={`px-1.5 py-0.5 rounded font-mono ${
            signal.endianness === 'little'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
          }`}
        >
          {signal.endianness === 'little' ? 'Intel' : 'Motorola'}
        </span>

        {signal.isSigned && (
          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-mono">
            Signed
          </span>
        )}

        {signal.unit && (
          <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/40 font-mono font-medium">
            {signal.unit}
          </span>
        )}
      </div>

      {/* Engineering Scale & Offset */}
      <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950/60 rounded px-2 py-1 border border-slate-200 dark:border-slate-800/80 flex justify-between">
        <span>scale: {signal.scale}</span>
        <span>offset: {signal.offset}</span>
      </div>

      {/* Output Terminal Pin */}
      <div
        ref={registerPinRef}
        data-pin-type="source"
        data-signal-id={signal.id}
        onMouseDown={(e) => onStartConnect(e, signal.id)}
        title="Drag connection to VHAL property pin"
        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-crosshair transition-all duration-200 z-20 ${
          isConnected
            ? 'bg-cyan-500 shadow-md shadow-cyan-500/50 border-2 border-white dark:border-slate-950'
            : 'bg-slate-400 dark:bg-slate-700 hover:bg-cyan-500 border-2 border-white dark:border-slate-900 hover:scale-125'
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
      </div>
    </div>
  );
};

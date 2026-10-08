import React, { useState } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { Search, ChevronDown, ChevronRight, Plus, Cpu, FileUp, Sparkles } from 'lucide-react';

export const CanSignalPalette: React.FC = () => {
  const {
    messages,
    searchCan,
    setSearchCan,
    activeCanNodeIds,
    addCanNodeToCanvas,
    setImportModalOpen,
    loadSamplePowertrainDbc,
  } = useVhalStore();

  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set([420, 500]));

  const toggleExpand = (msgId: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const filteredMessages = React.useMemo(() => {
    const q = searchCan.trim().toLowerCase();
    if (!q) return messages;

    return messages
      .map((msg) => {
        const msgMatches =
          msg.name.toLowerCase().includes(q) ||
          msg.hexId.toLowerCase().includes(q) ||
          msg.id.toString().includes(q);

        const filteredSignals = msg.signals.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.unit.toLowerCase().includes(q) ||
            (s.comment && s.comment.toLowerCase().includes(q))
        );

        if (msgMatches) return msg;
        if (filteredSignals.length > 0) {
          return { ...msg, signals: filteredSignals };
        }
        return null;
      })
      .filter(Boolean) as typeof messages;
  }, [messages, searchCan]);

  const totalLoadedSignals = messages.reduce((acc, m) => acc + m.signals.length, 0);

  return (
    <div className="w-80 h-full flex flex-col bg-slate-900/95 border-r border-slate-800/80 shrink-0">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              CAN Signals ({totalLoadedSignals})
            </span>
          </div>

          <button
            onClick={() => setImportModalOpen(true)}
            title="Import DBC or JSON matrix"
            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1 font-mono"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchCan}
            onChange={(e) => setSearchCan(e.target.value)}
            placeholder="Search signals, hex ID, unit..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Signals List / Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {messages.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <p className="text-xs text-slate-400 mb-3">No CAN signals loaded yet.</p>
            <div className="space-y-2">
              <button
                onClick={() => loadSamplePowertrainDbc()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample Powertrain DBC
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import DBC / JSON File
              </button>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No matching signals found for "{searchCan}"
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isExpanded = expandedMessages.has(msg.id) || !!searchCan;

            return (
              <div
                key={msg.id}
                className="rounded-lg bg-slate-950/60 border border-slate-800/80 overflow-hidden"
              >
                {/* Message Header Accordion */}
                <button
                  onClick={() => toggleExpand(msg.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-800/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-200 truncate">
                      {msg.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                      {msg.hexId}
                    </span>
                    <span className="text-slate-500">{msg.signals.length} sigs</span>
                  </div>
                </button>

                {/* Signals Sub-items */}
                {isExpanded && (
                  <div className="border-t border-slate-800/60 divide-y divide-slate-800/40">
                    {msg.signals.map((sig) => {
                      const isOnCanvas = activeCanNodeIds.includes(sig.id);

                      return (
                        <div
                          key={sig.id}
                          className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-900/60 transition-colors text-xs group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-200 font-medium truncate" title={sig.name}>
                                {sig.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>Bit {sig.startBit}:{sig.length}</span>
                              <span className={sig.endianness === 'little' ? 'text-blue-400' : 'text-amber-400'}>
                                {sig.endianness === 'little' ? 'LE' : 'BE'}
                              </span>
                              {sig.unit && <span className="text-cyan-400">[{sig.unit}]</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => addCanNodeToCanvas(sig.id)}
                            disabled={isOnCanvas}
                            title={isOnCanvas ? 'Already on canvas' : 'Add to canvas'}
                            className={`p-1 rounded transition-colors shrink-0 ${
                              isOnCanvas
                                ? 'text-cyan-500/50 bg-cyan-950/20 cursor-default'
                                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/60'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { CanNodeCard } from './CanNodeCard';
import { VhalNodeCard } from './VhalNodeCard';
import { SvgConnectorLayer, PinCoord } from './SvgConnectorLayer';
import { CanSignal, VhalProperty } from '../../types/automotive';
import { AOSP_VHAL_CATALOG } from '../../parsers/aospCatalog';
import { Link2, Sparkles, Plus, AlertCircle } from 'lucide-react';

export const MappingCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    activeMappings,
    activeCanNodeIds,
    activeVhalNodeIds,
    selectedConnectionId,
    removeCanNodeFromCanvas,
    removeVhalNodeFromCanvas,
    createConnection,
    removeConnection,
    setSelectedConnectionId,
    setEditingConnection,
    autoMapMatchingSignals,
  } = useVhalStore();

  // Pin coordinate caches
  const [sourcePinCoords, setSourcePinCoords] = useState<Map<string, PinCoord>>(new Map());
  const [targetPinCoords, setTargetPinCoords] = useState<Map<string, PinCoord>>(new Map());
  const [contentDimensions, setContentDimensions] = useState({ width: 1200, height: 800 });

  // Dragging connection state
  const [draggingPin, setDraggingPin] = useState<{
    signalId: string;
    startX: number;
    startY: number;
  } | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map of active signals and properties
  const activeSignals = React.useMemo(() => {
    const list: CanSignal[] = [];
    const idSet = new Set(activeCanNodeIds);

    // Also include any signals that have active mappings
    for (const m of activeMappings) {
      idSet.add(m.sourceSignalId);
    }

    for (const msg of messages) {
      for (const sig of msg.signals) {
        if (idSet.has(sig.id)) {
          list.push(sig);
        }
      }
    }
    return list;
  }, [messages, activeCanNodeIds, activeMappings]);

  const activeProperties = React.useMemo(() => {
    const list: VhalProperty[] = [];
    const nameSet = new Set(activeVhalNodeIds);

    // Also include any properties that have active mappings
    for (const m of activeMappings) {
      nameSet.add(m.targetPropertyId);
    }

    // Collect from activeMappings first
    const seen = new Set<string>();
    for (const m of activeMappings) {
      if (!seen.has(m.property.name)) {
        list.push(m.property);
        seen.add(m.property.name);
      }
    }

    // Then from catalog for activeVhalNodeIds
    for (const name of nameSet) {
      if (!seen.has(name)) {
        const found = AOSP_VHAL_CATALOG.find((p: VhalProperty) => p.name === name);
        if (found) {
          list.push(found);
          seen.add(name);
        }
      }
    }

    return list;
  }, [activeVhalNodeIds, activeMappings]);

  // Recalculate pin coordinates relative to contentRef
  const updatePinCoordinates = useCallback(() => {
    if (!contentRef.current) return;
    const contentRect = contentRef.current.getBoundingClientRect();

    const newSourcePins = new Map<string, PinCoord>();
    const newTargetPins = new Map<string, PinCoord>();

    // Query all pin elements
    const sourceElements = contentRef.current.querySelectorAll('[data-pin-type="source"]');
    sourceElements.forEach((el) => {
      const signalId = el.getAttribute('data-signal-id');
      if (signalId) {
        const rect = el.getBoundingClientRect();
        newSourcePins.set(signalId, {
          x: rect.left + rect.width / 2 - contentRect.left,
          y: rect.top + rect.height / 2 - contentRect.top,
        });
      }
    });

    const targetElements = contentRef.current.querySelectorAll('[data-pin-type="target"]');
    targetElements.forEach((el) => {
      const propName = el.getAttribute('data-property-name');
      if (propName) {
        const rect = el.getBoundingClientRect();
        newTargetPins.set(propName, {
          x: rect.left + rect.width / 2 - contentRect.left,
          y: rect.top + rect.height / 2 - contentRect.top,
        });
      }
    });

    setSourcePinCoords(newSourcePins);
    setTargetPinCoords(newTargetPins);
    setContentDimensions({
      width: contentRef.current.scrollWidth,
      height: Math.max(contentRef.current.scrollHeight, 600),
    });
  }, []);

  // Update pins on node changes, resize, or scroll
  useEffect(() => {
    const timer = setTimeout(updatePinCoordinates, 30);
    return () => clearTimeout(timer);
  }, [activeSignals, activeProperties, activeMappings, updatePinCoordinates]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      updatePinCoordinates();
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updatePinCoordinates]);

  // Handle Drag Connection
  const handleStartConnect = (e: React.MouseEvent, signalId: string) => {
    e.preventDefault();
    if (!contentRef.current) return;
    const contentRect = contentRef.current.getBoundingClientRect();

    setDraggingPin({
      signalId,
      startX: e.clientX - contentRect.left,
      startY: e.clientY - contentRect.top,
    });
    setMousePos({
      x: e.clientX - contentRect.left,
      y: e.clientY - contentRect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPin || !contentRef.current) return;
    const contentRect = contentRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - contentRect.left,
      y: e.clientY - contentRect.top,
    });
  };

  const handleMouseUp = () => {
    if (draggingPin) {
      setDraggingPin(null);
    }
  };

  const handleDropConnect = (propertyName: string) => {
    if (draggingPin) {
      createConnection(draggingPin.signalId, propertyName);
      setDraggingPin(null);
      setTimeout(updatePinCoordinates, 50);
    }
  };

  // Check if signal or property is connected
  const isSignalConnected = (signalId: string) => {
    return activeMappings.some((m) => m.sourceSignalId === signalId);
  };

  const isPropertyConnected = (propertyName: string) => {
    return activeMappings.some((m) => m.targetPropertyId === propertyName);
  };

  const connectingLine = draggingPin
    ? {
        startX: draggingPin.startX,
        startY: draggingPin.startY,
        endX: mousePos.x,
        endY: mousePos.y,
      }
    : null;

  const totalNodesCount = activeSignals.length + activeProperties.length;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-full overflow-y-auto overflow-x-hidden bg-slate-950/60 select-none border-x border-slate-800/80"
    >
      {/* Background Matrix Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#10b981 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      {/* Floating Canvas Status Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-2.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Active Mappings:</span>
            <span className="font-mono text-cyan-400 font-bold">{activeMappings.length}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Canvas Nodes:</span>
            <span className="font-mono text-slate-200 font-medium">{totalNodesCount}</span>
            <span className="text-[10px] text-slate-500">
              ({activeSignals.length} CAN / {activeProperties.length} VHAL)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && activeMappings.length === 0 && (
            <button
              onClick={() => autoMapMatchingSignals()}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Auto-Map Matching Signals
            </button>
          )}
        </div>
      </div>

      {/* Content Workspace */}
      <div
        ref={contentRef}
        className="relative min-h-[calc(100vh-140px)] p-6"
        style={{ minHeight: `${Math.max(600, Math.max(activeSignals.length, activeProperties.length) * 125)}px` }}
      >
        {/* SVG Bezier Connector Layer */}
        <SvgConnectorLayer
          connections={activeMappings}
          sourcePinCoords={sourcePinCoords}
          targetPinCoords={targetPinCoords}
          selectedConnectionId={selectedConnectionId}
          connectingLine={connectingLine}
          canvasWidth={contentDimensions.width}
          canvasHeight={contentDimensions.height}
          onSelectConnection={setSelectedConnectionId}
          onDeleteConnection={(id) => {
            removeConnection(id);
            setTimeout(updatePinCoordinates, 30);
          }}
          onEditConnection={(conn) => setEditingConnection(conn)}
        />

        {/* Empty State Banner */}
        {totalNodesCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-400 shadow-xl max-w-md">
              <Link2 className="w-10 h-10 mx-auto text-cyan-400 mb-3 animate-pulse" />
              <h3 className="text-base font-semibold text-slate-200 mb-1">Canvas is Ready</h3>
              <p className="text-xs text-slate-400 mb-4">
                Add signals from the left CAN palette or drag them here, select target AOSP properties from the right, and pull connection pins across lanes.
              </p>
              <div className="flex items-center justify-center gap-2 pointer-events-auto">
                <button
                  onClick={() => useVhalStore.getState().loadSamplePowertrainDbc()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors"
                >
                  Load Sample DBC
                </button>
                <button
                  onClick={() => useVhalStore.getState().setReverseModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  Reverse Engineer C++
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Dual-Lane Vertical Stack */}
        <div className="grid grid-cols-2 gap-24 relative z-20">
          {/* Left Lane: CAN Signal Nodes */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
              <span>CAN Signals Lane ({activeSignals.length})</span>
            </div>

            {activeSignals.map((sig) => (
              <CanNodeCard
                key={sig.id}
                signal={sig}
                isConnected={isSignalConnected(sig.id)}
                onRemove={() => {
                  removeCanNodeFromCanvas(sig.id);
                  setTimeout(updatePinCoordinates, 30);
                }}
                onStartConnect={handleStartConnect}
              />
            ))}
          </div>

          {/* Right Lane: AOSP Vehicle Properties */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <span>AOSP VHAL Properties Lane ({activeProperties.length})</span>
            </div>

            {activeProperties.map((prop) => (
              <VhalNodeCard
                key={prop.name}
                property={prop}
                isConnected={isPropertyConnected(prop.name)}
                onRemove={() => {
                  removeVhalNodeFromCanvas(prop.name);
                  setTimeout(updatePinCoordinates, 30);
                }}
                onDropConnect={handleDropConnect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

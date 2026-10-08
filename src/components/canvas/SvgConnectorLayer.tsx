import React, { useMemo } from 'react';
import { MappingConnection } from '../../types/automotive';
import { Settings, Trash2, Zap } from 'lucide-react';

export interface PinCoord {
  x: number;
  y: number;
}

interface SvgConnectorLayerProps {
  connections: MappingConnection[];
  sourcePinCoords: Map<string, PinCoord>; // key: signalId
  targetPinCoords: Map<string, PinCoord>; // key: propertyName
  selectedConnectionId: string | null;
  connectingLine: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  canvasWidth: number;
  canvasHeight: number;
  onSelectConnection: (id: string) => void;
  onDeleteConnection: (id: string) => void;
  onEditConnection: (conn: MappingConnection) => void;
}

export const SvgConnectorLayer: React.FC<SvgConnectorLayerProps> = ({
  connections,
  sourcePinCoords,
  targetPinCoords,
  selectedConnectionId,
  connectingLine,
  canvasWidth,
  canvasHeight,
  onSelectConnection,
  onDeleteConnection,
  onEditConnection,
}) => {
  // Pre-calculate path coordinates
  const paths = useMemo(() => {
    return connections.map((conn) => {
      const src = sourcePinCoords.get(conn.sourceSignalId);
      const tgt = targetPinCoords.get(conn.targetPropertyId);

      if (!src || !tgt) return null;

      const x1 = src.x;
      const y1 = src.y;
      const x2 = tgt.x;
      const y2 = tgt.y;

      const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      
      // Calculate mid-point on cubic bezier curve for math pill badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const isSelected = selectedConnectionId === conn.id;

      return {
        conn,
        d,
        x1,
        y1,
        x2,
        y2,
        midX,
        midY,
        isSelected,
      };
    }).filter(Boolean);
  }, [connections, sourcePinCoords, targetPinCoords, selectedConnectionId]);

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10 w-full h-full overflow-visible"
      width={canvasWidth}
      height={canvasHeight}
      style={{ willChange: 'contents' }}
    >
      <defs>
        <linearGradient id="splineGradientDefault" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
        </linearGradient>

        <linearGradient id="splineGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Render active connection splines */}
      {paths.map((p) => {
        if (!p) return null;
        const { conn, d, midX, midY, isSelected } = p;
        const hasCustomMath =
          conn.transform.customExpression &&
          conn.transform.customExpression !== 'raw' &&
          conn.transform.customExpression !== '';

        return (
          <g key={conn.id} className="group pointer-events-auto">
            {/* Wide transparent hit area for easy mouse click */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              className="cursor-pointer"
              onClick={() => onSelectConnection(conn.id)}
            />

            {/* Glowing background when selected */}
            {isSelected && (
              <path
                d={d}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeOpacity="0.4"
                filter="url(#glow)"
              />
            )}

            {/* Main visible cubic bezier line */}
            <path
              d={d}
              fill="none"
              stroke={isSelected ? 'url(#splineGradientSelected)' : 'url(#splineGradientDefault)'}
              strokeWidth={isSelected ? '3.5' : '2.2'}
              strokeDasharray={isSelected ? '8 4' : undefined}
              className={`transition-all duration-150 cursor-pointer ${
                isSelected ? 'animate-pulse' : 'group-hover:stroke-cyan-300'
              }`}
              onClick={() => onSelectConnection(conn.id)}
            />

            {/* Mid-point pill badge: Math / settings / delete */}
            <foreignObject
              x={midX - 55}
              y={midY - 14}
              width="110"
              height="28"
              className="overflow-visible pointer-events-auto"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn.id);
                }}
                className={`flex items-center justify-between gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono shadow-md backdrop-blur-sm border transition-transform duration-150 hover:scale-105 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 text-cyan-300 shadow-cyan-900/50'
                    : 'bg-slate-950/90 border-slate-700/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div
                  className="flex items-center gap-1 min-w-0 truncate"
                  title={conn.transform.customExpression || `scale: ${conn.signal.scale}`}
                >
                  <Zap className={`w-2.5 h-2.5 shrink-0 ${hasCustomMath ? 'text-amber-400' : 'text-cyan-400'}`} />
                  <span className="truncate">
                    {hasCustomMath ? 'f(x)' : `${conn.signal.scale !== 1 ? `×${conn.signal.scale}` : '1:1'}`}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditConnection(conn);
                    }}
                    title="Edit arithmetic transformation formula"
                    className="p-0.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Settings className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(conn.id);
                    }}
                    title="Delete connection"
                    className="p-0.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </foreignObject>
          </g>
        );
      })}

      {/* Live drag connection line when user pulls an anchor */}
      {connectingLine && (
        <g>
          {(() => {
            const { startX, startY, endX, endY } = connectingLine;
            const dx = Math.max(40, Math.abs(endX - startX) * 0.5);
            const livePath = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
            return (
              <>
                <path
                  d={livePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                <circle cx={endX} cy={endY} r="4" fill="#38bdf8" />
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
};


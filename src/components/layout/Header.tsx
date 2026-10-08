import React, { useState, useEffect, useRef } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import {
  Cpu,
  Code2,
  FileCode,
  Gauge,
  RotateCcw,
  Sparkles,
  Zap,
  FolderOpen,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeMappings,
    activeCanNodeIds,
    activeVhalNodeIds,
    setReverseModalOpen,
    setCodeGenOpen,
    setImportModalOpen,
    loadStressTest150,
    clearCanvas,
    notification,
  } = useVhalStore();

  // Live FPS Monitor
  const [fps, setFps] = useState<number>(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animId: number;

    const measureFps = (now: number) => {
      frameCount.current++;
      if (now - lastTime.current >= 500) {
        const measured = Math.round((frameCount.current * 1000) / (now - lastTime.current));
        setFps(Math.min(60, measured));
        frameCount.current = 0;
        lastTime.current = now;
      }
      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalNodes = activeCanNodeIds.length + activeVhalNodeIds.length;

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-5 shrink-0 z-40 select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-950/60 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-slate-100 font-mono">
              CAN-to-AOSP VHAL <span className="text-cyan-400 font-normal">Studio</span>
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono font-medium">
              v1.0 AIDL
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Bi-directional Automotive HAL Synthesizer & Reverse Engineering Engine
          </p>
        </div>
      </div>

      {/* Middle: Live Benchmark & FPS Performance Badge */}
      <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-slate-900/90 rounded-xl border border-slate-800/80 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">Hardware Perf:</span>
          <span
            className={`font-bold text-[11px] ${
              fps >= 55 ? 'text-emerald-400' : fps >= 40 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {fps} FPS
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-400">Nodes:</span>
          <span className="text-slate-200 font-semibold">{totalNodes}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Splines:</span>
          <span className="text-cyan-400 font-semibold">{activeMappings.length}</span>
        </div>

        {totalNodes >= 300 && (
          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60 text-[10px]">
            High Capacity Load
          </span>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Benchmark 150 Button */}
        <button
          onClick={() => loadStressTest150()}
          title="Instantly benchmark 150 CAN + 150 VHAL nodes and 150 cubic bezier splines"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 text-xs font-semibold shadow-sm transition-all duration-150"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          150-Node Stress Test
        </button>

        {/* Reverse Engineering Button */}
        <button
          onClick={() => setReverseModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition-colors"
        >
          <Code2 className="w-3.5 h-3.5 text-purple-400" />
          Reverse C++
        </button>

        {/* Import/Export */}
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          Import / Export
        </button>

        {/* Generate C++ Drawer Trigger */}
        <button
          onClick={() => setCodeGenOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/50 transition-all duration-150"
        >
          <FileCode className="w-3.5 h-3.5" />
          Generate C++
          {activeMappings.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] text-cyan-300 font-mono">
              {activeMappings.length}
            </span>
          )}
        </button>

        {/* Clear */}
        {totalNodes > 0 && (
          <button
            onClick={() => clearCanvas()}
            title="Clear all canvas nodes and connections"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-mono flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/80'
              : notification.type === 'info'
              ? 'bg-purple-950/90 text-purple-200 border-purple-800/80'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}
    </header>
  );
};


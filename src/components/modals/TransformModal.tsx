import React, { useState, useEffect } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { TransformRule } from '../../types/automotive';
import { X, Calculator, Zap, ArrowRight, Check } from 'lucide-react';

export const TransformModal: React.FC = () => {
  const {
    isTransformModalOpen,
    setTransformModalOpen,
    editingConnection,
    updateConnectionTransform,
  } = useVhalStore();

  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);
  const [offsetAddition, setOffsetAddition] = useState<number>(0.0);
  const [customExpression, setCustomExpression] = useState<string>('raw');
  const [targetTypeCast, setTargetTypeCast] = useState<'float' | 'int32_t' | 'bool' | 'int64_t'>('float');
  const [testRawVal, setTestRawVal] = useState<number>(100);

  useEffect(() => {
    if (editingConnection) {
      const tf = editingConnection.transform;
      setScaleMultiplier(tf.scaleMultiplier ?? 1.0);
      setOffsetAddition(tf.offsetAddition ?? 0.0);
      setCustomExpression(tf.customExpression || 'raw');
      setTargetTypeCast(tf.targetTypeCast || 'float');
    }
  }, [editingConnection]);

  if (!isTransformModalOpen || !editingConnection) return null;

  const { signal, property } = editingConnection;

  // Compute live test output value
  const calculateTestOutput = () => {
    try {
      if (customExpression && customExpression !== 'raw') {
        // Safe evaluation of arithmetic formula replacing 'raw'
        const sanitized = customExpression
          .replace(/\braw\b/g, String(testRawVal))
          .replace(/f\b/g, '')
          .replace(/[^0-9+\-*/(). eE]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized});`)();
        if (targetTypeCast === 'bool') return result ? 'true' : 'false';
        if (targetTypeCast === 'int32_t' || targetTypeCast === 'int64_t')
          return String(Math.floor(Number(result)));
        return Number(result).toFixed(3);
      } else {
        const raw = testRawVal;
        const totalScale = signal.scale * scaleMultiplier;
        const totalOffset = signal.offset + offsetAddition;
        const val = raw * totalScale + totalOffset;
        if (targetTypeCast === 'bool') return val ? 'true' : 'false';
        if (targetTypeCast === 'int32_t' || targetTypeCast === 'int64_t')
          return String(Math.floor(val));
        return val.toFixed(3);
      }
    } catch {
      return 'Calculation error';
    }
  };

  const handleApply = () => {
    updateConnectionTransform(editingConnection.id, {
      scaleMultiplier: Number(scaleMultiplier),
      offsetAddition: Number(offsetAddition),
      customExpression: customExpression.trim(),
      targetTypeCast,
    });
  };

  // Quick preset conversions
  const applyPreset = (presetExpr: string, presetMultiplier = 1.0) => {
    setCustomExpression(presetExpr);
    setScaleMultiplier(presetMultiplier);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Mathematical Conversion Formula
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {signal.name} <ArrowRight className="inline w-3 h-3 text-cyan-400" /> {property.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => setTransformModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Automotive Unit Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('raw / 3.6f')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                km/h → m/s (raw / 3.6)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('(raw * 0.1f) - 40.0f')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                DegC Offset ((raw * 0.1) - 40)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('raw * 0.25f')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                RPM Quad (raw * 0.25)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('raw * 100.0f')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                bar → kPa (raw * 100)
              </button>
            </div>
          </div>

          {/* Custom C++ Expression */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Custom C++ Expression (use <span className="text-cyan-400 font-mono">raw</span> for input signal)
            </label>
            <input
              type="text"
              value={customExpression}
              onChange={(e) => setCustomExpression(e.target.value)}
              placeholder="e.g. (raw * 0.01f) / 3.6f"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Scale Multiplier
              </label>
              <input
                type="number"
                step="any"
                value={scaleMultiplier}
                onChange={(e) => setScaleMultiplier(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Offset Addition
              </label>
              <input
                type="number"
                step="any"
                value={offsetAddition}
                onChange={(e) => setOffsetAddition(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Target C++ Type Cast
            </label>
            <select
              value={targetTypeCast}
              onChange={(e) => setTargetTypeCast(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="float">float (32-bit floating point)</option>
              <option value="int32_t">int32_t (32-bit signed integer)</option>
              <option value="bool">bool (boolean)</option>
              <option value="int64_t">int64_t (64-bit signed integer)</option>
            </select>
          </div>

          {/* Live Simulator Box */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Live Equation Evaluator
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 block mb-0.5">Test Raw CAN Value</span>
                <input
                  type="number"
                  value={testRawVal}
                  onChange={(e) => setTestRawVal(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-3" />

              <div className="flex-1">
                <span className="text-[10px] text-slate-500 block mb-0.5">Physical Result ({property.defaultUnit || 'unit'})</span>
                <div className="px-2 py-1 bg-slate-900 border border-emerald-800/60 rounded font-mono text-xs text-emerald-400 font-bold truncate">
                  {calculateTestOutput()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={() => setTransformModalOpen(false)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Formula
          </button>
        </div>
      </div>
    </div>
  );
};


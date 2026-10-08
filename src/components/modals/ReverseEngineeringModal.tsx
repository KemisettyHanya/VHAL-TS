import React, { useState } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { SAMPLE_VENDOR_VHAL_CPP, parseCppVhalCode } from '../../parsers/cppReverseParser';
import { X, Code2, Sparkles, Upload, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export const ReverseEngineeringModal: React.FC = () => {
  const {
    isReverseModalOpen,
    setReverseModalOpen,
    loadCppReverseContent,
  } = useVhalStore();

  const [cppCode, setCppCode] = useState<string>(SAMPLE_VENDOR_VHAL_CPP);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  if (!isReverseModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCppCode(content);
        const preview = parseCppVhalCode(content);
        setPreviewResult(preview);
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyzePreview = () => {
    const preview = parseCppVhalCode(cppCode);
    setPreviewResult(preview);
  };

  const handleDecompile = () => {
    loadCppReverseContent(cppCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/50">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Reverse Engineering Studio: C++ to Visual Graph
              </h3>
              <p className="text-xs text-slate-400">
                Decompile vendor HAL code (<span className="text-purple-400 font-mono">onCanFrameReceived</span>) into live CAN signals, VHAL properties, and SVG bezier splines
              </p>
            </div>
          </div>

          <button
            onClick={() => setReverseModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCppCode(SAMPLE_VENDOR_VHAL_CPP);
                setPreviewResult(parseCppVhalCode(SAMPLE_VENDOR_VHAL_CPP));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Load Vendor Sample C++
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload .cpp / .h
              <input
                type="file"
                accept=".cpp,.cc,.cxx,.h,.hpp,.c"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={handleAnalyzePreview}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
          >
            Quick AST Scan
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 grid grid-cols-5 divide-x divide-slate-800">
          {/* C++ Code Editor */}
          <div className="col-span-3 flex flex-col p-4 bg-slate-950/60 min-h-0">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Vendor C++ Source Code
            </label>
            <textarea
              value={cppCode}
              onChange={(e) => {
                setCppCode(e.target.value);
                setPreviewResult(null);
              }}
              placeholder="// Paste AOSP onCanFrameReceived or vendor HAL code here..."
              className="w-full flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none overflow-y-auto"
            />
          </div>

          {/* AST Decompiler Inspection Pane */}
          <div className="col-span-2 flex flex-col p-4 bg-slate-900/40 min-h-0 overflow-y-auto">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              AST Parsing Inspector
            </h4>

            {previewResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40">
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    Decompilation Analysis Ready
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-slate-300 font-mono text-[11px]">
                    <div>CAN Messages: <span className="text-purple-400 font-bold">{previewResult.messages.length}</span></div>
                    <div>Mapped Signals: <span className="text-purple-400 font-bold">{previewResult.connections.length}</span></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Extracted Signal-to-Property Bindings:
                  </span>
                  {previewResult.connections.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-slate-200 font-semibold">
                        <span>{c.signal.name}</span>
                        <ArrowRight className="w-3 h-3 text-purple-400" />
                        <span className="text-emerald-400">{c.property.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Formula: <span className="text-cyan-300">{c.transform.customExpression || 'raw'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Code2 className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs">Click "Decompile to Canvas" or "Quick AST Scan" to inspect extracted signals and bindings.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/90">
          <span className="text-xs text-slate-500 font-mono">
            Compliant with Android 13/14+ AIDL IVehicle Hal patterns
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReverseModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDecompile}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50 transition-all duration-150"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Decompile to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


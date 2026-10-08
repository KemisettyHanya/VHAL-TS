import React, { useState, useMemo } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { synthesizeVhalCpp } from '../../codegen/cppSynthesizer';
import { X, Copy, Download, Check, ShieldCheck, Terminal, FileCode } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';

export const CodeGenDrawer: React.FC = () => {
  const { isCodeGenOpen, setCodeGenOpen, activeMappings } = useVhalStore();

  const [copied, setCopied] = useState(false);
  const [includeSafetyGuards, setIncludeSafetyGuards] = useState(true);
  const [serviceClassName, setServiceClassName] = useState('CanVhalHalService');

  // Generate C++ code
  const cppCode = useMemo(() => {
    return synthesizeVhalCpp(activeMappings, {
      serviceClassName,
      includeSafetyGuards,
      generateComments: true,
    });
  }, [activeMappings, serviceClassName, includeSafetyGuards]);

  // Syntax highlight
  const highlightedCode = useMemo(() => {
    try {
      return Prism.highlight(cppCode, Prism.languages.cpp, 'cpp');
    } catch {
      return cppCode;
    }
  }, [cppCode]);

  if (!isCodeGenOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(cppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([cppCode], { type: 'text/x-c++src;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${serviceClassName}.cpp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Synthesized AOSP AIDL VHAL Code
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              MISRA-C++ Compliant • {activeMappings.length} Active Mappings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download .cpp
          </button>

          <button
            onClick={() => setCodeGenOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Configuration Strip */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900/40 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
              Static Safety Checks Enabled
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={includeSafetyGuards}
              onChange={(e) => setIncludeSafetyGuards(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            DLC Guards
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Class:</span>
          <input
            type="text"
            value={serviceClassName}
            onChange={(e) => setServiceClassName(e.target.value)}
            className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto p-4 bg-[#1d1f21] text-xs font-mono">
        <pre className="!bg-transparent !p-0 !m-0 !text-slate-200 leading-relaxed">
          <code
            className="language-cpp"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/80 text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>Target: aidl::android::hardware::automotive::vehicle</span>
        <span>AOSP Android 13/14+ AIDL IVehicle</span>
      </div>
    </div>
  );
};


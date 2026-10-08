import React, { useState } from 'react';
import { useVhalStore } from '../../store/vhalStore';
import { SAMPLE_POWERTRAIN_DBC } from '../../parsers/dbcParser';
import { X, Upload, Download, FileText, Database, Sparkles, Check } from 'lucide-react';

type TabType = 'dbc' | 'json_matrix' | 'workspace_export' | 'workspace_import';

export const ImportExportModal: React.FC = () => {
  const {
    isImportModalOpen,
    setImportModalOpen,
    loadDbcContent,
    loadJsonMatrixContent,
    loadSamplePowertrainDbc,
    exportWorkspace,
    importWorkspace,
  } = useVhalStore();

  const [activeTab, setActiveTab] = useState<TabType>('dbc');
  const [dbcText, setDbcText] = useState<string>('');
  const [jsonMatrixText, setJsonMatrixText] = useState<string>('');
  const [importWorkspaceText, setImportWorkspaceText] = useState<string>('');
  const [exportedJson, setExportedJson] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isImportModalOpen) return null;

  const handleDbcFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setDbcText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonMatrixText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleWorkspaceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportWorkspaceText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyDbc = () => {
    const success = loadDbcContent(dbcText);
    if (success) setImportModalOpen(false);
  };

  const handleApplyJsonMatrix = () => {
    const success = loadJsonMatrixContent(jsonMatrixText);
    if (success) setImportModalOpen(false);
  };

  const handleApplyWorkspaceImport = () => {
    const success = importWorkspace(importWorkspaceText);
    if (success) setImportModalOpen(false);
  };

  const handleGenerateExport = () => {
    const str = exportWorkspace();
    setExportedJson(str);
  };

  const handleDownloadWorkspace = () => {
    const str = exportWorkspace();
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vhal_mapping_workspace.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Vehicle Signal & Workspace Management
              </h3>
              <p className="text-xs text-slate-400">
                Vector DBC, JSON matrices, and session state persistence
              </p>
            </div>
          </div>

          <button
            onClick={() => setImportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('dbc')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'dbc'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Vector DBC
          </button>
          <button
            onClick={() => setActiveTab('json_matrix')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'json_matrix'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import JSON Matrix
          </button>
          <button
            onClick={() => {
              setActiveTab('workspace_export');
              handleGenerateExport();
            }}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'workspace_export'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Export Workspace
          </button>
          <button
            onClick={() => setActiveTab('workspace_import')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'workspace_import'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Workspace
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 text-xs">
          {activeTab === 'dbc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Vector DBC Format Definition
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDbcText(SAMPLE_POWERTRAIN_DBC);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/50"
                  >
                    <Sparkles className="w-3 h-3" />
                    Load Sample DBC
                  </button>
                  <label className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Browse .dbc
                    <input
                      type="file"
                      accept=".dbc,.txt"
                      onChange={handleDbcFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                value={dbcText}
                onChange={(e) => setDbcText(e.target.value)}
                placeholder="Paste Vector DBC file contents here (BO_ and SG_ lines)..."
                rows={9}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleApplyDbc}
                  disabled={!dbcText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md transition-colors"
                >
                  Parse & Load Signals
                </button>
              </div>
            </div>
          )}

          {activeTab === 'json_matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Structured Vehicle Signal Matrix (JSON)
                </span>
                <label className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  Browse .json
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={jsonMatrixText}
                onChange={(e) => setJsonMatrixText(e.target.value)}
                placeholder="Paste JSON signal matrix: [{ id: '0x1A4', name: 'SpeedFrame', signals: [...] }]"
                rows={9}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleApplyJsonMatrix}
                  disabled={!jsonMatrixText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md transition-colors"
                >
                  Parse JSON Matrix
                </button>
              </div>
            </div>
          )}

          {activeTab === 'workspace_export' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Export Workspace (<span className="text-cyan-400 font-mono">vhal_mapping_workspace.json</span>)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportedJson);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadWorkspace}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download JSON
                  </button>
                </div>
              </div>

              <textarea
                value={exportedJson}
                readOnly
                rows={9}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'workspace_import' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Restore Saved Workspace Session
                </span>
                <label className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  Browse Workspace File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleWorkspaceFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={importWorkspaceText}
                onChange={(e) => setImportWorkspaceText(e.target.value)}
                placeholder="Paste vhal_mapping_workspace.json file contents here..."
                rows={9}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleApplyWorkspaceImport}
                  disabled={!importWorkspaceText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md transition-colors"
                >
                  Restore Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


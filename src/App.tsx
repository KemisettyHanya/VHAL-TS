import React, { useEffect } from 'react';
import { useVhalStore } from './store/vhalStore';
import { Header } from './components/layout/Header';
import { CanSignalPalette } from './components/panels/CanSignalPalette';
import { VhalCatalogPalette } from './components/panels/VhalCatalogPalette';
import { MappingCanvas } from './components/canvas/MappingCanvas';
import { TransformModal } from './components/modals/TransformModal';
import { ReverseEngineeringModal } from './components/modals/ReverseEngineeringModal';
import { CodeGenDrawer } from './components/modals/CodeGenDrawer';
import { ImportExportModal } from './components/modals/ImportExportModal';

export const App: React.FC = () => {
  const { messages, loadSamplePowertrainDbc } = useVhalStore();

  useEffect(() => {
    // If empty on first load, initialize with sample DBC & mappings
    if (messages.length === 0) {
      loadSamplePowertrainDbc();
    }
  }, [messages.length, loadSamplePowertrainDbc]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Top Header */}
      <Header />

      {/* Main 3-Column Studio Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Searchable CAN Signal Palette */}
        <CanSignalPalette />

        {/* Center Column: Active Dynamic Mapping Canvas */}
        <MappingCanvas />

        {/* Right Column: Searchable AOSP Vehicle Properties Catalog */}
        <VhalCatalogPalette />
      </main>

      {/* Overlays, Drawers & Modals */}
      <TransformModal />
      <ReverseEngineeringModal />
      <CodeGenDrawer />
      <ImportExportModal />
    </div>
  );
};

export default App;


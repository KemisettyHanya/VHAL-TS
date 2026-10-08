import { create } from 'zustand';
import {
  CanMessage,
  CanSignal,
  MappingConnection,
  TransformRule,
  VhalDomain,
  VhalProperty,
  WorkspaceData,
} from '../types/automotive';
import { AOSP_VHAL_CATALOG, getVhalPropertyByName } from '../parsers/aospCatalog';
import { parseDbc, parseJsonMatrix, SAMPLE_POWERTRAIN_DBC } from '../parsers/dbcParser';
import { parseCppVhalCode, SAMPLE_VENDOR_VHAL_CPP } from '../parsers/cppReverseParser';

interface VhalState {
  // Data
  messages: CanMessage[];
  activeMappings: MappingConnection[];
  activeCanNodeIds: string[];
  activeVhalNodeIds: string[];

  // Selection & UI state
  selectedConnectionId: string | null;
  editingConnection: MappingConnection | null;
  searchCan: string;
  searchVhal: string;
  selectedDomain: VhalDomain | 'ALL';
  
  // Modals & Panels
  isReverseModalOpen: boolean;
  isCodeGenOpen: boolean;
  isImportModalOpen: boolean;
  isTransformModalOpen: boolean;
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;

  // Interactive Connection Drag State
  connectingSourcePin: { signalId: string; x: number; y: number } | null;
  mousePos: { x: number; y: number };
  // Theme State
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Actions
  setSearchCan: (query: string) => void;
  setSearchVhal: (query: string) => void;
  setSelectedDomain: (domain: VhalDomain | 'ALL') => void;
  setSelectedConnectionId: (id: string | null) => void;
  setEditingConnection: (conn: MappingConnection | null) => void;
  setReverseModalOpen: (open: boolean) => void;
  setCodeGenOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setTransformModalOpen: (open: boolean) => void;
  setConnectingSourcePin: (pin: { signalId: string; x: number; y: number } | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  setNotification: (notif: { message: string; type: 'success' | 'info' | 'error' } | null) => void;

  // Core Operations
  loadDbcContent: (content: string) => boolean;
  loadJsonMatrixContent: (content: string) => boolean;
  loadCppReverseContent: (code: string) => boolean;
  loadSamplePowertrainDbc: () => void;
  loadSampleVendorCpp: () => void;
  loadStressTest150: () => void;

  addCanNodeToCanvas: (signalId: string) => void;
  removeCanNodeFromCanvas: (signalId: string) => void;
  addVhalNodeToCanvas: (propertyName: string) => void;
  removeVhalNodeFromCanvas: (propertyName: string) => void;

  createConnection: (
    signalId: string,
    propertyName: string,
    customTransform?: Partial<TransformRule>
  ) => boolean;
  removeConnection: (connectionId: string) => void;
  updateConnectionTransform: (
    connectionId: string,
    transform: Partial<TransformRule>
  ) => void;

  autoMapMatchingSignals: () => number;
  clearCanvas: () => void;
  exportWorkspace: () => string;
  importWorkspace: (jsonStr: string) => boolean;
}

export const useVhalStore = create<VhalState>((set, get) => ({
  messages: [],
  activeMappings: [],
  activeCanNodeIds: [],
  activeVhalNodeIds: [],

  selectedConnectionId: null,
  editingConnection: null,
  searchCan: '',
  searchVhal: '',
  selectedDomain: 'ALL',

  isReverseModalOpen: false,
  isCodeGenOpen: false,
  isImportModalOpen: false,
  isTransformModalOpen: false,
  notification: null,

  connectingSourcePin: null,
  mousePos: { x: 0, y: 0 },
  theme: (typeof window !== 'undefined' && (localStorage.getItem('vhal_theme') as any)) || 'light',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vhal_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setSearchCan: (query) => set({ searchCan: query }),
  setSearchVhal: (query) => set({ searchVhal: query }),
  setSelectedDomain: (domain) => set({ selectedDomain: domain }),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setEditingConnection: (conn) =>
    set({ editingConnection: conn, isTransformModalOpen: !!conn }),
  setReverseModalOpen: (open) => set({ isReverseModalOpen: open }),
  setCodeGenOpen: (open) => set({ isCodeGenOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  setTransformModalOpen: (open) => set({ isTransformModalOpen: open }),
  setConnectingSourcePin: (pin) => set({ connectingSourcePin: pin }),
  setMousePos: (pos) => set({ mousePos: pos }),
  setNotification: (notif) => {
    set({ notification: notif });
    if (notif) {
      setTimeout(() => {
        if (get().notification?.message === notif.message) {
          set({ notification: null });
        }
      }, 4000);
    }
  },

  loadDbcContent: (content) => {
    const res = parseDbc(content);
    if (res.messages.length === 0) {
      get().setNotification({
        message: 'No valid CAN messages or signals parsed from DBC.',
        type: 'error',
      });
      return false;
    }

    set({ messages: res.messages });
    get().setNotification({
      message: `Parsed ${res.messages.length} messages and ${res.totalSignals} signals from DBC.`,
      type: 'success',
    });
    return true;
  },

  loadJsonMatrixContent: (content) => {
    const res = parseJsonMatrix(content);
    if (res.messages.length === 0) {
      get().setNotification({
        message: res.errors[0] || 'Invalid CAN JSON signal matrix.',
        type: 'error',
      });
      return false;
    }

    set({ messages: res.messages });
    get().setNotification({
      message: `Parsed ${res.messages.length} messages and ${res.totalSignals} signals from JSON.`,
      type: 'success',
    });
    return true;
  },

  loadCppReverseContent: (code) => {
    const res = parseCppVhalCode(code);
    if (res.connections.length === 0 && res.messages.length === 0) {
      get().setNotification({
        message: 'No onCanFrameReceived or VehicleProperty mappings detected in C++ code.',
        type: 'error',
      });
      return false;
    }

    // Merge or replace messages
    const newActiveCanIds: string[] = [];
    const newActiveVhalIds: string[] = [];

    for (const conn of res.connections) {
      if (!newActiveCanIds.includes(conn.sourceSignalId)) {
        newActiveCanIds.push(conn.sourceSignalId);
      }
      if (!newActiveVhalIds.includes(conn.targetPropertyId)) {
        newActiveVhalIds.push(conn.targetPropertyId);
      }
    }

    set({
      messages: res.messages,
      activeMappings: res.connections,
      activeCanNodeIds: newActiveCanIds,
      activeVhalNodeIds: newActiveVhalIds,
      isReverseModalOpen: false,
    });

    get().setNotification({
      message: `Reverse-engineered ${res.connections.length} connections across ${res.messages.length} CAN messages!`,
      type: 'success',
    });
    return true;
  },

  loadSamplePowertrainDbc: () => {
    get().loadDbcContent(SAMPLE_POWERTRAIN_DBC);
    // Populate some default sample mappings for a ready-to-test canvas
    const sampleSignals = [
      '0x1A4:VehicleSpeed',
      '0x1A4:SteeringWheelAngle',
      '0x1A4:BrakePedalPosition',
      '0x1F4:EngineSpeed',
      '0x1F4:EngineCoolantTemp',
      '0x262:HighVoltageBatteryLevel',
      '0x2D0:FrontLeftDoorLocked',
      '0x33E:CabinMeasuredTemp',
    ];

    const signalMap: Record<string, string> = {
      '0x1A4:VehicleSpeed': 'PERF_VEHICLE_SPEED',
      '0x1A4:SteeringWheelAngle': 'PERF_STEERING_ANGLE',
      '0x1A4:BrakePedalPosition': 'BRAKE_PEDAL_POSITION',
      '0x1F4:EngineSpeed': 'ENGINE_RPM',
      '0x1F4:EngineCoolantTemp': 'ENGINE_COOLANT_TEMP',
      '0x262:HighVoltageBatteryLevel': 'EV_BATTERY_LEVEL',
      '0x2D0:FrontLeftDoorLocked': 'DOOR_LOCK',
      '0x33E:CabinMeasuredTemp': 'HVAC_TEMPERATURE_CURRENT',
    };

    // Find actual signals in loaded messages
    const state = get();
    for (const msg of state.messages) {
      for (const sig of msg.signals) {
        const targetProp = signalMap[sig.id] || signalMap[`${msg.hexId}:${sig.name}`];
        if (targetProp) {
          get().addCanNodeToCanvas(sig.id);
          get().addVhalNodeToCanvas(targetProp);
          get().createConnection(sig.id, targetProp);
        }
      }
    }

    get().setNotification({
      message: 'Loaded Sample Powertrain DBC with interactive initial canvas mappings.',
      type: 'success',
    });
  },

  loadSampleVendorCpp: () => {
    get().loadCppReverseContent(SAMPLE_VENDOR_VHAL_CPP);
  },

  loadStressTest150: () => {
    // Generate 150 CAN signals + 150 VHAL property cards (300 nodes total) and 150 SVG connections
    const stressMessages: CanMessage[] = [];
    const connections: MappingConnection[] = [];
    const activeCanIds: string[] = [];
    const activeVhalIds: string[] = [];

    // Create 15 CAN messages with 10 signals each = 150 signals
    let signalIndex = 0;
    for (let m = 0; m < 15; m++) {
      const msgId = 0x100 + m * 0x10;
      const hexId = `0x${msgId.toString(16).toUpperCase()}`;
      const msgSignals: CanSignal[] = [];

      for (let s = 0; s < 10; s++) {
        signalIndex++;
        const sigName = `StressSignal_${signalIndex}`;
        const sigId = `${hexId}:${sigName}`;

        const sig: CanSignal = {
          id: sigId,
          name: sigName,
          messageId: msgId,
          messageName: `BENCHMARK_FRAME_${m + 1}`,
          startBit: (s % 8) * 8,
          length: 16,
          endianness: s % 2 === 0 ? 'little' : 'big',
          isSigned: s % 3 === 0,
          scale: 0.1 * (s + 1),
          offset: 0,
          min: 0,
          max: 5000,
          unit: s % 2 === 0 ? 'm/s' : 'rpm',
          receiver: 'VHAL',
          comment: `Benchmark stress node #${signalIndex}`,
        };

        msgSignals.push(sig);
        activeCanIds.push(sigId);

        // Map to a corresponding VHAL property (cycle through catalog or generated benchmark properties)
        const catalogProp = AOSP_VHAL_CATALOG[signalIndex % AOSP_VHAL_CATALOG.length];
        const benchmarkPropName = `${catalogProp.name}_${signalIndex}`;
        const prop: VhalProperty = {
          ...catalogProp,
          name: benchmarkPropName,
          id: catalogProp.id + signalIndex,
          hexId: `0x${(catalogProp.id + signalIndex).toString(16).toUpperCase()}`,
          description: `Stress benchmark target #${signalIndex} (${catalogProp.domain})`,
        };

        activeVhalIds.push(benchmarkPropName);

        const conn: MappingConnection = {
          id: `stress_conn_${signalIndex}`,
          sourceSignalId: sigId,
          targetPropertyId: benchmarkPropName,
          canMessageId: msgId,
          signal: sig,
          property: prop,
          transform: {
            scaleMultiplier: 1.0,
            offsetAddition: 0.0,
            customExpression: `raw * ${sig.scale}f`,
            targetTypeCast: 'float',
          },
          notes: `Benchmark connection ${signalIndex} / 150`,
          createdSource: 'manual',
        };

        connections.push(conn);
      }

      stressMessages.push({
        id: msgId,
        hexId,
        name: `BENCHMARK_FRAME_${m + 1}`,
        dlc: 8,
        sender: `ECU_${m + 1}`,
        signals: msgSignals,
      });
    }

    set({
      messages: stressMessages,
      activeMappings: connections,
      activeCanNodeIds: activeCanIds,
      activeVhalNodeIds: activeVhalIds,
    });

    get().setNotification({
      message: `Stress benchmark loaded: 150 CAN signals + 150 VHAL property cards (300 nodes total) and 150 active SVG cubic bezier splines!`,
      type: 'info',
    });
  },

  addCanNodeToCanvas: (signalId) => {
    const current = get().activeCanNodeIds;
    if (!current.includes(signalId)) {
      set({ activeCanNodeIds: [...current, signalId] });
    }
  },

  removeCanNodeFromCanvas: (signalId) => {
    set((state) => ({
      activeCanNodeIds: state.activeCanNodeIds.filter((id) => id !== signalId),
      activeMappings: state.activeMappings.filter(
        (m) => m.sourceSignalId !== signalId
      ),
    }));
  },

  addVhalNodeToCanvas: (propertyName) => {
    const current = get().activeVhalNodeIds;
    if (!current.includes(propertyName)) {
      set({ activeVhalNodeIds: [...current, propertyName] });
    }
  },

  removeVhalNodeFromCanvas: (propertyName) => {
    set((state) => ({
      activeVhalNodeIds: state.activeVhalNodeIds.filter(
        (name) => name !== propertyName
      ),
      activeMappings: state.activeMappings.filter(
        (m) => m.targetPropertyId !== propertyName
      ),
    }));
  },

  createConnection: (signalId, propertyName, customTransform) => {
    const state = get();
    // Check if connection already exists
    const exists = state.activeMappings.some(
      (m) => m.sourceSignalId === signalId && m.targetPropertyId === propertyName
    );
    if (exists) return false;

    // Find signal
    let signal: CanSignal | undefined;
    for (const msg of state.messages) {
      const found = msg.signals.find((s) => s.id === signalId);
      if (found) {
        signal = found;
        break;
      }
    }
    if (!signal) return false;

    // Find property
    let property = getVhalPropertyByName(propertyName);
    if (!property) {
      // Check in existing active mappings or create placeholder
      property = state.activeMappings.find((m) => m.property.name === propertyName)?.property;
    }
    if (!property) return false;

    // Ensure nodes are on canvas
    if (!state.activeCanNodeIds.includes(signalId)) {
      get().addCanNodeToCanvas(signalId);
    }
    if (!state.activeVhalNodeIds.includes(propertyName)) {
      get().addVhalNodeToCanvas(propertyName);
    }

    const defaultTransform: TransformRule = {
      scaleMultiplier: 1.0,
      offsetAddition: 0.0,
      customExpression:
        signal.scale !== 1.0 || signal.offset !== 0.0
          ? `(raw * ${signal.scale}f) + ${signal.offset}f`
          : 'raw',
      targetTypeCast: property.dataType === 'booleanValues' ? 'bool' : 'float',
      ...customTransform,
    };

    const newConn: MappingConnection = {
      id: `conn_${signal.id}_${property.name}_${Date.now()}`,
      sourceSignalId: signalId,
      targetPropertyId: propertyName,
      canMessageId: signal.messageId,
      signal,
      property,
      transform: defaultTransform,
      createdSource: 'manual',
    };

    set((s) => ({
      activeMappings: [...s.activeMappings, newConn],
      selectedConnectionId: newConn.id,
    }));

    get().setNotification({
      message: `Connected ${signal.name} -> ${property.name}`,
      type: 'success',
    });
    return true;
  },

  removeConnection: (connectionId) => {
    set((state) => ({
      activeMappings: state.activeMappings.filter((m) => m.id !== connectionId),
      selectedConnectionId:
        state.selectedConnectionId === connectionId
          ? null
          : state.selectedConnectionId,
    }));
  },

  updateConnectionTransform: (connectionId, transform) => {
    set((state) => ({
      activeMappings: state.activeMappings.map((m) =>
        m.id === connectionId
          ? { ...m, transform: { ...m.transform, ...transform } }
          : m
      ),
      editingConnection: null,
      isTransformModalOpen: false,
    }));
  },

  autoMapMatchingSignals: () => {
    const state = get();
    let count = 0;

    for (const msg of state.messages) {
      for (const sig of msg.signals) {
        const sigNormalized = sig.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Find best match in catalog
        const match = AOSP_VHAL_CATALOG.find((prop) => {
          const propNormalized = prop.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            propNormalized.includes(sigNormalized) ||
            sigNormalized.includes(propNormalized) ||
            (sigNormalized.includes('speed') && propNormalized.includes('speed')) ||
            (sigNormalized.includes('rpm') && propNormalized.includes('rpm')) ||
            (sigNormalized.includes('temp') && propNormalized.includes('temp')) ||
            (sigNormalized.includes('steer') && propNormalized.includes('steer')) ||
            (sigNormalized.includes('brake') && propNormalized.includes('brake')) ||
            (sigNormalized.includes('gear') && propNormalized.includes('gear'))
          );
        });

        if (match) {
          const created = get().createConnection(sig.id, match.name);
          if (created) count++;
        }
      }
    }

    get().setNotification({
      message: `Auto-mapped ${count} matching signals to AOSP properties!`,
      type: 'success',
    });
    return count;
  },

  clearCanvas: () => {
    set({
      activeMappings: [],
      activeCanNodeIds: [],
      activeVhalNodeIds: [],
      selectedConnectionId: null,
      editingConnection: null,
    });
    get().setNotification({
      message: 'Canvas cleared.',
      type: 'info',
    });
  },

  exportWorkspace: () => {
    const state = get();
    const data: WorkspaceData = {
      version: '1.0.0',
      appName: 'CAN-to-AOSP VHAL Studio',
      timestamp: new Date().toISOString(),
      messages: state.messages,
      activeMappings: state.activeMappings,
      activeCanNodeIds: state.activeCanNodeIds,
      activeVhalNodeIds: state.activeVhalNodeIds,
    };
    return JSON.stringify(data, null, 2);
  },

  importWorkspace: (jsonStr) => {
    try {
      const data: WorkspaceData = JSON.parse(jsonStr);
      if (!data.messages || !data.activeMappings) {
        get().setNotification({
          message: 'Invalid workspace file format.',
          type: 'error',
        });
        return false;
      }

      set({
        messages: data.messages,
        activeMappings: data.activeMappings,
        activeCanNodeIds: data.activeCanNodeIds || [],
        activeVhalNodeIds: data.activeVhalNodeIds || [],
        selectedConnectionId: null,
      });

      get().setNotification({
        message: `Workspace imported with ${data.activeMappings.length} mappings!`,
        type: 'success',
      });
      return true;
    } catch (err: any) {
      get().setNotification({
        message: `Import failed: ${err?.message || 'Parse error'}`,
        type: 'error',
      });
      return false;
    }
  },
}));


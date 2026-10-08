// Automotive HAL & CAN Type Definitions

export type Endianness = 'little' | 'big'; // little = Intel (@1+), big = Motorola (@0+)

export interface CanSignal {
  id: string; // Unique signal ID, e.g. "0x1A4:VehicleSpeed"
  name: string;
  messageId: number;
  messageName: string;
  startBit: number;
  length: number;
  endianness: Endianness;
  isSigned: boolean;
  scale: number;
  offset: number;
  min: number;
  max: number;
  unit: string;
  receiver?: string;
  comment?: string;
  multiplexerIndicator?: string; // e.g., "M" or "m0"
}

export interface CanMessage {
  id: number;
  hexId: string; // e.g. "0x1A4"
  name: string;
  dlc: number;
  sender: string;
  signals: CanSignal[];
  comment?: string;
}

export type VhalDataType =
  | 'floatValues'
  | 'int32Values'
  | 'booleanValues'
  | 'int64Values'
  | 'stringValues'
  | 'byteValues';

export type VhalAreaType =
  | 'GLOBAL'
  | 'WHEEL'
  | 'SEAT'
  | 'DOOR'
  | 'WINDOW'
  | 'MIRROR';

export type VhalDomain =
  | 'Dynamics'
  | 'Powertrain'
  | 'HVAC'
  | 'Body'
  | 'Chassis'
  | 'Electrification'
  | 'Sensors';

export interface VhalProperty {
  name: string; // e.g. "PERF_VEHICLE_SPEED"
  id: number; // e.g. 0x11600207
  hexId: string; // e.g. "0x11600207"
  dataType: VhalDataType;
  areaType: VhalAreaType;
  defaultUnit: string;
  domain: VhalDomain;
  description: string;
  access?: 'READ' | 'WRITE' | 'READ_WRITE';
  changeMode?: 'CONTINUOUS' | 'ON_CHANGE' | 'STATIC';
}

export interface TransformRule {
  scaleMultiplier: number;
  offsetAddition: number;
  customExpression: string; // e.g. "raw / 3.6f" or "(raw * 0.01f)"
  targetTypeCast: 'float' | 'int32_t' | 'bool' | 'int64_t';
  clampMin?: number;
  clampMax?: number;
  description?: string;
}

export interface MappingConnection {
  id: string;
  sourceSignalId: string;
  targetPropertyId: string;
  canMessageId: number;
  signal: CanSignal;
  property: VhalProperty;
  transform: TransformRule;
  notes?: string;
  createdSource: 'manual' | 'dbc' | 'reverse_cpp';
}

export interface WorkspaceData {
  version: string;
  appName: string;
  timestamp: string;
  messages: CanMessage[];
  activeMappings: MappingConnection[];
  activeCanNodeIds: string[];
  activeVhalNodeIds: string[];
  sourceCodeContext?: string;
}


import {
  CanMessage,
  CanSignal,
  MappingConnection,
  TransformRule,
  VhalProperty,
  Endianness,
} from '../types/automotive';
import { getVhalPropertyByName, getVhalPropertyByHexId, AOSP_VHAL_CATALOG } from './aospCatalog';

export interface CppReverseResult {
  messages: CanMessage[];
  connections: MappingConnection[];
  reconstructedProperties: VhalProperty[];
  warnings: string[];
  totalParsedSignals: number;
}

export function parseCppVhalCode(code: string): CppReverseResult {
  const messages: CanMessage[] = [];
  const connections: MappingConnection[] = [];
  const reconstructedProperties: VhalProperty[] = [];
  const warnings: string[] = [];

  const messageMap = new Map<number, CanMessage>();
  const propMap = new Map<string, VhalProperty>();

  // Helper to ensure message exists
  function getOrCreateMessage(msgId: number, nameHint?: string): CanMessage {
    if (messageMap.has(msgId)) return messageMap.get(msgId)!;
    const hexId = `0x${msgId.toString(16).toUpperCase()}`;
    const msg: CanMessage = {
      id: msgId,
      hexId,
      name: nameHint || `MSG_${hexId}`,
      dlc: 8,
      sender: 'ECU',
      signals: [],
      comment: 'Reverse-engineered from C++ VHAL source',
    };
    messageMap.set(msgId, msg);
    messages.push(msg);
    return msg;
  }

  // Helper to match property
  function resolveProperty(propRef: string): VhalProperty {
    // Check if propRef has VehicleProperty::<NAME>
    const enumMatch = propRef.match(/VehicleProperty::([A-Za-z0-9_]+)/);
    const propName = enumMatch ? enumMatch[1] : propRef.trim();

    let prop = getVhalPropertyByName(propName);
    if (!prop) {
      // Check hex
      const hexMatch = propRef.match(/0x[0-9a-fA-F]+/);
      if (hexMatch) {
        prop = getVhalPropertyByHexId(hexMatch[0]);
      }
    }

    if (!prop) {
      // Fallback: create dynamic property entry
      prop = {
        name: propName,
        id: 0x19900000 + (propMap.size + 1),
        hexId: `0x${(0x19900000 + (propMap.size + 1)).toString(16).toUpperCase()}`,
        dataType: 'floatValues',
        areaType: 'GLOBAL',
        defaultUnit: 'custom',
        domain: 'Dynamics',
        description: `Custom reverse-engineered property: ${propName}`,
      };
    }

    if (!propMap.has(prop.name)) {
      propMap.set(prop.name, prop);
      reconstructedProperties.push(prop);
    }
    return prop;
  }

  // 1. Split code into message blocks: either case 0x...: or if (frame.can_id == 0x...)
  // We match switch cases or if statements
  const caseRegex = /(?:case\s+(0x[0-9a-fA-F]+|\d+)\s*:|if\s*\(\s*(?:frame\.)?can_id\s*==\s*(0x[0-9a-fA-F]+|\d+)\s*\))/g;
  
  const matches: { idStr: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = caseRegex.exec(code)) !== null) {
    const idStr = m[1] || m[2];
    matches.push({ idStr, index: m.index });
  }

  // Process each message block
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const startIndex = cur.index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : code.length;
    const blockCode = code.slice(startIndex, endIndex);

    const msgId = cur.idStr.startsWith('0x') || cur.idStr.startsWith('0X')
      ? parseInt(cur.idStr, 16)
      : parseInt(cur.idStr, 10);
    
    // Look for comments above or inside for message name
    const commentNameMatch = blockCode.match(/\/\/\s*(?:Message|Frame|CAN\s*ID)?\s*[:\-]?\s*([A-Za-z0-9_]+)/i);
    const msgName = commentNameMatch ? commentNameMatch[1] : undefined;
    const canMessage = getOrCreateMessage(msgId, msgName);

    // Map variable names to their raw byte extraction logic
    // e.g. uint16_t raw_speed = (frame.data[0] << 8) | frame.data[1];
    // e.g. uint16_t raw_speed = frame.data[0] | (frame.data[1] << 8);
    // e.g. uint8_t raw_temp = frame.data[2];
    const varExtractionMap = new Map<
      string,
      {
        rawExpr: string;
        endianness: Endianness;
        startByte: number;
        numBytes: number;
        isSigned: boolean;
      }
    >();

    // Map variable names to arithmetic transformation formulas
    // e.g. float speed_kmh = (raw_speed * 0.01f);
    // e.g. float speed_mps = speed_kmh / 3.6f;
    const varMathMap = new Map<string, string>();

    // Split block into statements
    const lines = blockCode.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;

      // Detect raw byte extraction:
      // Examples:
      // (uint16_t|int16_t|uint8_t|int8_t|uint32_t|int32_t|auto)\s+([a-zA-Z0-9_]+)\s*=\s*(.*);
      const assignMatch = line.match(
        /(?:uint\d+_t|int\d+_t|float|double|bool|auto|int|unsigned)\s+([a-zA-Z0-9_]+)\s*=\s*([^;]+);/
      );

      if (assignMatch) {
        const varName = assignMatch[1];
        const rhs = assignMatch[2].trim();

        // Check if RHS extracts from frame.data or data
        if (rhs.includes('frame.data') || rhs.includes('data[')) {
          // Detect byte indices
          const byteIndices: number[] = [];
          const byteIdxMatches = rhs.matchAll(/(?:frame\.)?data\[(\d+)\]/g);
          for (const b of byteIdxMatches) {
            byteIndices.push(parseInt(b[1], 10));
          }

          let endianness: Endianness = 'little';
          // If first byte is shifted << 8 and combined with second byte:
          // data[0] << 8 | data[1] => Big Endian (Motorola)
          // data[0] | data[1] << 8 => Little Endian (Intel)
          if (rhs.match(/data\[\d+\]\s*<<\s*8/)) {
            const shiftFirst = rhs.search(/data\[\d+\]\s*<<\s*8/);
            const dataOther = rhs.search(/data\[\d+\](?!\s*<<)/);
            if (shiftFirst < dataOther) {
              endianness = 'big';
            } else {
              endianness = 'little';
            }
          }

          const startByte = byteIndices.length > 0 ? Math.min(...byteIndices) : 0;
          const numBytes = byteIndices.length > 0 ? byteIndices.length : 1;
          const isSigned = line.includes('int16_t') || line.includes('int8_t') || line.includes('int32_t');

          varExtractionMap.set(varName, {
            rawExpr: rhs,
            endianness,
            startByte,
            numBytes,
            isSigned,
          });
        } else {
          // It's a derived/math variable
          varMathMap.set(varName, rhs);
        }
      }
    }

    // Now detect vehicle property mappings in the block
    // Common patterns:
    // 1) prop.prop = static_cast<int32_t>(VehicleProperty::<NAME>); ... prop.value.<type> = { <expr> };
    // 2) dispatch/sendPropertyEvent(VehicleProperty::<NAME>, <expr>);
    // 3) VehiclePropValue val; val.prop = ...;
    // 4) mCallback->onPropertyEvent({ createProp(VehicleProperty::<NAME>, <expr>) });
    
    // Look for all VehicleProperty references or hex properties in the block
    const propAssignments = findPropertyAssignments(blockCode);

    for (const pa of propAssignments) {
      const vhalProp = resolveProperty(pa.propertyIdentifier);
      const valueExpression = pa.valueExpression.trim();

      // Trace back the value expression to raw signal and math transform
      const { signalName, transform, startByte, numBytes, endianness, isSigned } =
        resolveSignalAndTransform(
          valueExpression,
          varExtractionMap,
          varMathMap,
          vhalProp.name
        );

      const signalId = `${canMessage.hexId}:${signalName}`;
      
      // Check if signal already exists in this message
      let signal = canMessage.signals.find((s) => s.name === signalName);
      if (!signal) {
        signal = {
          id: signalId,
          name: signalName,
          messageId: canMessage.id,
          messageName: canMessage.name,
          startBit: startByte * 8,
          length: numBytes * 8,
          endianness,
          isSigned,
          scale: transform.scaleMultiplier,
          offset: transform.offsetAddition,
          min: 0,
          max: 100,
          unit: vhalProp.defaultUnit,
          receiver: 'VHAL',
          comment: `Reconstructed from C++: ${valueExpression}`,
        };
        canMessage.signals.push(signal);
      }

      // Create mapping connection
      const connectionId = `conn_${signal.id}_${vhalProp.name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      connections.push({
        id: connectionId,
        sourceSignalId: signal.id,
        targetPropertyId: vhalProp.name,
        canMessageId: canMessage.id,
        signal,
        property: vhalProp,
        transform,
        notes: `Reverse-engineered from C++ expression: ${valueExpression}`,
        createdSource: 'reverse_cpp',
      });
    }
  }

  const totalParsedSignals = messages.reduce((acc, m) => acc + m.signals.length, 0);

  return {
    messages,
    connections,
    reconstructedProperties,
    warnings,
    totalParsedSignals,
  };
}

interface PropertyAssignment {
  propertyIdentifier: string;
  valueExpression: string;
}

function findPropertyAssignments(blockCode: string): PropertyAssignment[] {
  const assignments: PropertyAssignment[] = [];

  // Pattern 1:
  // prop.prop = ... VehicleProperty::NAME ...
  // ...
  // prop.value.floatValues = { expr } or .push_back(expr)
  const propAssignRegex = /(?:([a-zA-Z0-9_]+)\.prop\s*=\s*(?:static_cast<[^>]+>\s*)?\((?:VehicleProperty::([a-zA-Z0-9_]+)|(0x[0-9a-fA-F]+))\)|(?:([a-zA-Z0-9_]+)\.prop\s*=\s*(?:VehicleProperty::([a-zA-Z0-9_]+)|(0x[0-9a-fA-F]+))))/g;

  let paMatch: RegExpExecArray | null;
  while ((paMatch = propAssignRegex.exec(blockCode)) !== null) {
    const varName = paMatch[1] || paMatch[4];
    const propName = paMatch[2] || paMatch[5] || paMatch[3] || paMatch[6];
    if (!propName) continue;

    // Search for value assigned to this variable afterwards
    const afterCode = blockCode.slice(paMatch.index);
    const valueMatch = afterCode.match(
      new RegExp(
        `${varName}\\.value\\.(?:floatValues|int32Values|booleanValues|int64Values)\\s*=\\s*\\{?\\s*([^;\\}]+)\\s*\\}?;`
      )
    );

    const pushMatch = afterCode.match(
      new RegExp(
        `${varName}\\.value\\.(?:floatValues|int32Values|booleanValues|int64Values)\\.push_back\\(\\s*([^\\)]+)\\s*\\);`
      )
    );

    const expr = valueMatch ? valueMatch[1] : pushMatch ? pushMatch[1] : '';
    if (expr) {
      assignments.push({
        propertyIdentifier: propName,
        valueExpression: expr.trim(),
      });
    }
  }

  // Pattern 2: Function call pattern
  // dispatchProperty(VehicleProperty::NAME, expr);
  // publish(VehicleProperty::NAME, expr);
  // createPropValue(VehicleProperty::NAME, expr);
  const callRegex = /(?:dispatch|send|publish|create|emit|set)(?:Vehicle)?Property(?:Value)?\s*\(\s*(?:VehicleProperty::([a-zA-Z0-9_]+)|(0x[0-9a-fA-F]+))\s*,\s*([^,\);]+)/g;
  let callMatch: RegExpExecArray | null;
  while ((callMatch = callRegex.exec(blockCode)) !== null) {
    const propName = callMatch[1] || callMatch[2];
    const expr = callMatch[3];
    if (propName && expr) {
      assignments.push({
        propertyIdentifier: propName,
        valueExpression: expr.trim(),
      });
    }
  }

  // Pattern 3: Directly initializing struct
  // VehiclePropValue val = { .prop = (int32_t)VehicleProperty::NAME, .value = { ... } };
  const structInitRegex = /VehicleProperty::([A-Za-z0-9_]+)[^;]*?(?:floatValues|int32Values|booleanValues)\s*=\s*\{?\s*([^;\}]+)\s*\}?/g;
  let structMatch: RegExpExecArray | null;
  while ((structMatch = structInitRegex.exec(blockCode)) !== null) {
    const propName = structMatch[1];
    const expr = structMatch[2];
    if (!assignments.some((a) => a.propertyIdentifier === propName)) {
      assignments.push({
        propertyIdentifier: propName,
        valueExpression: expr.trim(),
      });
    }
  }

  return assignments;
}

function resolveSignalAndTransform(
  valueExpression: string,
  varExtractionMap: Map<string, { rawExpr: string; endianness: Endianness; startByte: number; numBytes: number; isSigned: boolean }>,
  varMathMap: Map<string, string>,
  targetPropertyName: string
): {
  signalName: string;
  transform: TransformRule;
  startByte: number;
  numBytes: number;
  endianness: Endianness;
  isSigned: boolean;
} {
  let expr = valueExpression;
  let rawVarName = '';

  // Check if expression directly references a raw extraction var
  for (const rawName of varExtractionMap.keys()) {
    if (expr.includes(rawName)) {
      rawVarName = rawName;
      break;
    }
  }

  // Recursively expand intermediate math vars until raw variable is reached
  let passCount = 0;
  while (!rawVarName && passCount < 6) {
    passCount++;
    let substituted = false;
    for (const [mathName, mathExpr] of varMathMap.entries()) {
      if (expr.includes(mathName)) {
        expr = expr.split(mathName).join(`(${mathExpr})`);
        substituted = true;
      }
    }
    for (const rawName of varExtractionMap.keys()) {
      if (expr.includes(rawName)) {
        rawVarName = rawName;
        break;
      }
    }
    if (!substituted) break;
  }

  const extraction = rawVarName ? varExtractionMap.get(rawVarName) : undefined;
  const startByte = extraction ? extraction.startByte : 0;
  const numBytes = extraction ? extraction.numBytes : 2;
  const endianness = extraction ? extraction.endianness : 'little';
  const isSigned = extraction ? extraction.isSigned : false;

  // Derive human-readable signal name
  let signalName = '';
  if (rawVarName) {
    // e.g. raw_speed -> RawSpeed, rawRpm -> RawRpm
    signalName = rawVarName
      .replace(/^raw_?/, '')
      .replace(/^([a-z])/, (m) => m.toUpperCase());
    signalName = `Sig_${signalName}`;
  } else {
    signalName = `Sig_${targetPropertyName}`;
  }

  // Analyze mathematical operations in expression:
  // e.g. "raw_speed * 0.01f / 3.6f"
  // or "(raw_temp - 40.0f)"
  let scaleMultiplier = 1.0;
  let offsetAddition = 0.0;
  let customExpression = expr;

  // If raw variable was found, replace it with 'raw' in custom expression
  if (rawVarName) {
    customExpression = expr.split(rawVarName).join('raw');
  }

  // Clean static casts: static_cast<float>(...)
  customExpression = customExpression.replace(/static_cast<[^>]+>\(([^)]+)\)/g, '$1');

  // Attempt to extract scale if format is raw * S or raw / D
  const scaleMulMatch = customExpression.match(/raw\s*\*\s*([0-9.]+)(?:f)?/);
  if (scaleMulMatch) {
    scaleMultiplier = parseFloat(scaleMulMatch[1]);
  }
  const scaleDivMatch = customExpression.match(/raw(?:\s*\*\s*[0-9.]+f?)?\s*\/\s*([0-9.]+)(?:f)?/);
  if (scaleDivMatch) {
    const divisor = parseFloat(scaleDivMatch[1]);
    if (divisor !== 0) {
      scaleMultiplier = scaleMultiplier / divisor;
    }
  }

  const offsetMatch = customExpression.match(/([+-]\s*[0-9.]+)(?:f)?(?!\s*\*)/);
  if (offsetMatch) {
    offsetAddition = parseFloat(offsetMatch[1].replace(/\s+/g, ''));
  }

  const transform: TransformRule = {
    scaleMultiplier: isNaN(scaleMultiplier) ? 1.0 : scaleMultiplier,
    offsetAddition: isNaN(offsetAddition) ? 0.0 : offsetAddition,
    customExpression: customExpression.trim(),
    targetTypeCast: targetPropertyName.includes('SPEED') || targetPropertyName.includes('RPM') || targetPropertyName.includes('TEMP')
      ? 'float'
      : 'int32_t',
  };

  return {
    signalName,
    transform,
    startByte,
    numBytes,
    endianness,
    isSigned,
  };
}

export const SAMPLE_VENDOR_VHAL_CPP = `// CAN-to-AOSP VHAL Translation Implementation
// Target Architecture: Android Automotive OS AIDL IVehicle
#include <aidl/android/hardware/automotive/vehicle/VehicleProperty.h>
#include <aidl/android/hardware/automotive/vehicle/VehiclePropValue.h>
#include <linux/can.h>
#include <cstdint>

using aidl::android::hardware::automotive::vehicle::VehicleProperty;
using aidl::android::hardware::automotive::vehicle::VehiclePropValue;

void CanVhalHalService::onCanFrameReceived(const struct can_frame& frame) {
    switch (frame.can_id) {
        // Message: VehicleDynamics (0x1A4)
        case 0x1A4: {
            // Motorola Big-Endian speed unpacking
            uint16_t raw_speed = (frame.data[0] << 8) | frame.data[1];
            float speed_kmh = raw_speed * 0.01f;
            float speed_mps = speed_kmh / 3.6f;

            VehiclePropValue propSpeed;
            propSpeed.prop = static_cast<int32_t>(VehicleProperty::PERF_VEHICLE_SPEED);
            propSpeed.areaId = 0;
            propSpeed.value.floatValues = { speed_mps };
            mCallback->onPropertyEvent({ propSpeed });

            // Steering angle
            int16_t raw_steering = static_cast<int16_t>((frame.data[2] << 8) | frame.data[3]);
            float steering_deg = raw_steering * 0.1f;

            VehiclePropValue propSteer;
            propSteer.prop = static_cast<int32_t>(VehicleProperty::PERF_STEERING_ANGLE);
            propSteer.areaId = 0;
            propSteer.value.floatValues = { steering_deg };
            mCallback->onPropertyEvent({ propSteer });

            // Brake pedal position
            uint8_t raw_brake = frame.data[4];
            float brake_pct = raw_brake * 0.39215686f;

            VehiclePropValue propBrake;
            propBrake.prop = static_cast<int32_t>(VehicleProperty::BRAKE_PEDAL_POSITION);
            propBrake.areaId = 0;
            propBrake.value.floatValues = { brake_pct };
            mCallback->onPropertyEvent({ propBrake });
            break;
        }

        // Message: EngineStatus (0x1F4)
        case 0x1F4: {
            // Intel Little-Endian engine RPM
            uint16_t raw_rpm = frame.data[0] | (frame.data[1] << 8);
            float rpm = raw_rpm * 0.25f;

            VehiclePropValue propRpm;
            propRpm.prop = static_cast<int32_t>(VehicleProperty::ENGINE_RPM);
            propRpm.areaId = 0;
            propRpm.value.floatValues = { rpm };
            mCallback->onPropertyEvent({ propRpm });

            // Engine Coolant Temperature
            uint8_t raw_coolant = frame.data[2];
            float coolant_temp = static_cast<float>(raw_coolant) - 40.0f;

            VehiclePropValue propCoolant;
            propCoolant.prop = static_cast<int32_t>(VehicleProperty::ENGINE_COOLANT_TEMP);
            propCoolant.areaId = 0;
            propCoolant.value.floatValues = { coolant_temp };
            mCallback->onPropertyEvent({ propCoolant });

            // Parking brake boolean status
            bool is_parked = (frame.data[5] & 0x01) != 0;

            VehiclePropValue propPark;
            propPark.prop = static_cast<int32_t>(VehicleProperty::PARKING_BRAKE_ON);
            propPark.areaId = 0;
            propPark.value.booleanValues = { is_parked };
            mCallback->onPropertyEvent({ propPark });
            break;
        }

        // Message: BatteryManagement (0x262)
        case 0x262: {
            uint16_t raw_batt = frame.data[0] | (frame.data[1] << 8);
            float batt_wh = raw_batt * 10.0f;

            VehiclePropValue propBatt;
            propBatt.prop = static_cast<int32_t>(VehicleProperty::EV_BATTERY_LEVEL);
            propBatt.areaId = 0;
            propBatt.value.floatValues = { batt_wh };
            mCallback->onPropertyEvent({ propBatt });

            bool is_plugged = (frame.data[4] & 0x01) != 0;
            VehiclePropValue propPlug;
            propPlug.prop = static_cast<int32_t>(VehicleProperty::EV_CHARGE_PORT_CONNECTED);
            propPlug.areaId = 0;
            propPlug.value.booleanValues = { is_plugged };
            mCallback->onPropertyEvent({ propPlug });
            break;
        }

        default:
            // Unmapped CAN message ID
            break;
    }
}
`;


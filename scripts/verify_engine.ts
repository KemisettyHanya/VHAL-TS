// Verification Suite for CAN-to-AOSP VHAL Mapping Studio

import { parseDbc, parseJsonMatrix, SAMPLE_POWERTRAIN_DBC } from '../src/parsers/dbcParser';
import { parseCppVhalCode, SAMPLE_VENDOR_VHAL_CPP } from '../src/parsers/cppReverseParser';
import { synthesizeVhalCpp } from '../src/codegen/cppSynthesizer';
import { AOSP_VHAL_CATALOG, getVhalPropertyByName, getVhalPropertyByHexId } from '../src/parsers/aospCatalog';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('1. TESTING AOSP AIDL VehicleProperty CATALOG');
console.log('======================================================');
assert(AOSP_VHAL_CATALOG.length >= 25, `Catalog loaded with ${AOSP_VHAL_CATALOG.length} properties`);

const speedProp = getVhalPropertyByName('PERF_VEHICLE_SPEED');
assert(speedProp !== undefined, 'Found PERF_VEHICLE_SPEED by name');
assert(speedProp?.hexId === '0x11600207', `PERF_VEHICLE_SPEED hex ID is 0x11600207`);
assert(speedProp?.dataType === 'floatValues', 'PERF_VEHICLE_SPEED data type is floatValues');
assert(speedProp?.defaultUnit === 'm/s', 'PERF_VEHICLE_SPEED default unit is m/s');

const rpmProp = getVhalPropertyByName('ENGINE_RPM');
assert(rpmProp?.hexId === '0x11600205', 'ENGINE_RPM hex ID is 0x11600205');
assert(rpmProp?.domain === 'Powertrain', 'ENGINE_RPM domain is Powertrain');

const hexLookup = getVhalPropertyByHexId('0x11600207');
assert(hexLookup?.name === 'PERF_VEHICLE_SPEED', 'Lookup by hex ID 0x11600207 succeeded');

console.log('\n======================================================');
console.log('2. TESTING DBC PARSER (FR-1.1 & FR-1.2)');
console.log('======================================================');
const dbcResult = parseDbc(SAMPLE_POWERTRAIN_DBC);
assert(dbcResult.messages.length === 5, `Parsed 5 CAN messages (got ${dbcResult.messages.length})`);
assert(dbcResult.totalSignals >= 20, `Parsed ${dbcResult.totalSignals} total signals`);

const dynamicsMsg = dbcResult.messages.find((m) => m.id === 420);
assert(dynamicsMsg !== undefined, 'Found VehicleDynamics message (ID 420)');
assert(dynamicsMsg?.signals.length === 6, `VehicleDynamics has 6 signals (got ${dynamicsMsg?.signals.length})`);

const speedSig = dynamicsMsg?.signals.find((s) => s.name === 'VehicleSpeed');
assert(speedSig !== undefined, 'Found VehicleSpeed signal in message 420');
assert(speedSig?.endianness === 'big', 'VehicleSpeed endianness is Motorola (@0+) / big-endian');
assert(speedSig?.scale === 0.01, `VehicleSpeed scale is 0.01 (got ${speedSig?.scale})`);
assert(speedSig?.unit === 'km/h', `VehicleSpeed unit is km/h (got ${speedSig?.unit})`);

const steerSig = dynamicsMsg?.signals.find((s) => s.name === 'SteeringWheelAngle');
assert(steerSig?.isSigned === true, 'SteeringWheelAngle is signed (@0-)');
assert(steerSig?.scale === 0.1, 'SteeringWheelAngle scale is 0.1');

const engineMsg = dbcResult.messages.find((m) => m.id === 500);
const rpmSig = engineMsg?.signals.find((s) => s.name === 'EngineSpeed');
assert(rpmSig?.endianness === 'little', 'EngineSpeed endianness is Intel (@1+) / little-endian');
assert(rpmSig?.scale === 0.25, `EngineSpeed scale is 0.25 (got ${rpmSig?.scale})`);

// Test JSON Matrix Ingestion
const jsonTest = JSON.stringify([
  {
    id: '0x350',
    name: 'RadarTrack',
    dlc: 8,
    sender: 'RADAR',
    signals: [
      {
        name: 'TargetDistance',
        start_bit: 0,
        bit_length: 16,
        byte_order: 'intel',
        scale: 0.1,
        offset: 0,
        unit: 'm'
      }
    ]
  }
]);
const jsonResult = parseJsonMatrix(jsonTest);
assert(jsonResult.messages.length === 1, 'JSON matrix parsed 1 message');
assert(jsonResult.messages[0].signals[0].name === 'TargetDistance', 'Parsed TargetDistance signal from JSON');
assert(jsonResult.messages[0].signals[0].scale === 0.1, 'JSON signal scale is 0.1');

console.log('\n======================================================');
console.log('3. TESTING REVERSE ENGINEERING ENGINE (FR-2.1 & FR-2.2)');
console.log('======================================================');
const reverseResult = parseCppVhalCode(SAMPLE_VENDOR_VHAL_CPP);
assert(reverseResult.messages.length === 3, `Reverse parsed 3 CAN message branches (got ${reverseResult.messages.length})`);
assert(reverseResult.connections.length >= 7, `Reverse reconstructed ${reverseResult.connections.length} connections (expected >= 7)`);

const speedConn = reverseResult.connections.find((c) => c.property.name === 'PERF_VEHICLE_SPEED');
assert(speedConn !== undefined, 'Reverse engineered connection to PERF_VEHICLE_SPEED');
assert(speedConn?.canMessageId === 0x1A4, `Mapped CAN Message ID is 0x1A4 (got 0x${speedConn?.canMessageId.toString(16)})`);
assert(speedConn?.signal.endianness === 'big', 'Vehicle speed correctly recognized as Motorola Big Endian from frame.data[0] << 8 | frame.data[1]');
assert(speedConn?.transform.customExpression.includes('3.6'), `Extracted km/h to m/s conversion (/ 3.6): ${speedConn?.transform.customExpression}`);

const rpmConn = reverseResult.connections.find((c) => c.property.name === 'ENGINE_RPM');
assert(rpmConn !== undefined, 'Reverse engineered connection to ENGINE_RPM');
assert(rpmConn?.canMessageId === 0x1F4, 'Mapped to Message 0x1F4');
assert(rpmConn?.signal.endianness === 'little', 'RPM correctly recognized as Intel Little Endian from frame.data[0] | frame.data[1] << 8');

const parkConn = reverseResult.connections.find((c) => c.property.name === 'PARKING_BRAKE_ON');
assert(parkConn !== undefined, 'Reverse engineered boolean connection to PARKING_BRAKE_ON');

console.log('\n======================================================');
console.log('4. TESTING FORWARD CODE SYNTHESIZER (FR-4.1 & NFR-3)');
console.log('======================================================');
const generatedCpp = synthesizeVhalCpp(reverseResult.connections, {
  serviceClassName: 'CanVhalHalService',
  includeSafetyGuards: true,
  generateComments: true,
});

assert(generatedCpp.includes('void CanVhalHalService::onCanFrameReceived(const struct can_frame& frame)'), 'Contains standard onCanFrameReceived function signature');
assert(generatedCpp.includes('case 0x1A4:'), 'Contains switch case for 0x1A4');
assert(generatedCpp.includes('case 0x1F4:'), 'Contains switch case for 0x1F4');
assert(generatedCpp.includes('case 0x262:'), 'Contains switch case for 0x262');
assert(generatedCpp.includes('VehicleProperty::PERF_VEHICLE_SPEED'), 'Populates VehicleProperty::PERF_VEHICLE_SPEED');
assert(generatedCpp.includes('VehicleProperty::ENGINE_RPM'), 'Populates VehicleProperty::ENGINE_RPM');
assert(generatedCpp.includes('mCallback->onPropertyEvent'), 'Dispatches via mCallback->onPropertyEvent');
assert(generatedCpp.includes('if (frame.can_dlc < 8)'), 'Includes DLC safety bounds checking');

console.log('\n======================================================');
console.log('5. TESTING HIGH-CAPACITY PERFORMANCE LOAD (FR-3.3)');
console.log('======================================================');
// Simulate 150 CAN signals + 150 VHAL properties (300 nodes total) and 150 connections
const stressConns: any[] = [];
for (let i = 0; i < 150; i++) {
  const catalogProp = AOSP_VHAL_CATALOG[i % AOSP_VHAL_CATALOG.length];
  stressConns.push({
    id: `stress_${i}`,
    sourceSignalId: `0x100:Sig_${i}`,
    targetPropertyId: `${catalogProp.name}_${i}`,
    canMessageId: 0x100 + Math.floor(i / 10),
    signal: {
      id: `0x100:Sig_${i}`,
      name: `Sig_${i}`,
      messageId: 0x100 + Math.floor(i / 10),
      messageName: `FRAME_${Math.floor(i / 10)}`,
      startBit: (i % 8) * 8,
      length: 16,
      endianness: i % 2 === 0 ? 'little' : 'big',
      isSigned: false,
      scale: 0.1,
      offset: 0,
      min: 0,
      max: 1000,
      unit: 'm/s',
    },
    property: {
      ...catalogProp,
      name: `${catalogProp.name}_${i}`,
      id: catalogProp.id + i,
      hexId: `0x${(catalogProp.id + i).toString(16).toUpperCase()}`,
    },
    transform: {
      scaleMultiplier: 1.0,
      offsetAddition: 0.0,
      customExpression: 'raw * 0.1f',
      targetTypeCast: 'float',
    },
    createdSource: 'manual',
  });
}

const startTime = performance.now();
const stressCpp = synthesizeVhalCpp(stressConns);
const endTime = performance.now();
assert(stressConns.length === 150, '150 active mapping connections prepared');
assert(stressCpp.length > 5000, `Synthesized C++ code length for 150 connections is ${stressCpp.length} bytes`);
assert(endTime - startTime < 100, `C++ code generation for 150 connections took ${(endTime - startTime).toFixed(2)}ms (< 100ms)`);

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}


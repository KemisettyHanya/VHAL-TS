import { CanMessage, CanSignal, Endianness } from '../types/automotive';

export interface DbcParseResult {
  messages: CanMessage[];
  errors: string[];
  totalSignals: number;
}

export function parseDbc(dbcContent: string): DbcParseResult {
  const messages: CanMessage[] = [];
  const errors: string[] = [];
  const lines = dbcContent.split(/\r?\n/);

  let currentMessage: CanMessage | null = null;
  const messageMap = new Map<number, CanMessage>();
  const signalComments = new Map<string, string>(); // key: `${msgId}:${sigName}`
  const messageComments = new Map<number, string>();

  // Regular expressions for DBC elements
  // BO_ <ID> <Name>: <DLC> <Sender>
  const boRegex = /^\s*BO_\s+(\d+)\s+([A-Za-z0-9_]+)\s*:\s*(\d+)\s+([A-Za-z0-9_]+)/;
  
  // SG_ <Name> [M|m<ID>] : <StartBit>|<Length>@<Endian><Sign> (<Scale>,<Offset>) [<Min>|<Max>] "<Unit>" <Receiver>
  const sgRegex = /^\s*SG_\s+([A-Za-z0-9_]+)(?:\s+([Mm0-9]+))?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([-+0-9.eE]+),([+-0-9.eE]+)\)\s*\[([-+0-9.eE]+)\|([-+0-9.eE]+)\]\s*"([^"]*)"\s*([A-Za-z0-9_,]+)?/;

  // Comments: CM_ BO_ <ID> "..." or CM_ SG_ <ID> <Name> "..."
  const cmBoRegex = /^\s*CM_\s+BO_\s+(\d+)\s+"([^"]*)";?/;
  const cmSgRegex = /^\s*CM_\s+SG_\s+(\d+)\s+([A-Za-z0-9_]+)\s+"([^"]*)";?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    // Check BO_
    const boMatch = line.match(boRegex);
    if (boMatch) {
      const rawId = parseInt(boMatch[1], 10);
      // Strip 0x80000000 extended CAN flag if present in DBC
      const id = rawId & 0x1fffffff;
      const hexId = `0x${id.toString(16).toUpperCase()}`;
      const name = boMatch[2];
      const dlc = parseInt(boMatch[3], 10);
      const sender = boMatch[4];

      currentMessage = {
        id,
        hexId,
        name,
        dlc,
        sender,
        signals: [],
      };
      messages.push(currentMessage);
      messageMap.set(id, currentMessage);
      continue;
    }

    // Check SG_
    const sgMatch = line.match(sgRegex);
    if (sgMatch) {
      if (!currentMessage) {
        errors.push(`Line ${i + 1}: Found signal definition before any message (BO_)`);
        continue;
      }

      const sigName = sgMatch[1];
      const multiplexerIndicator = sgMatch[2];
      const startBit = parseInt(sgMatch[3], 10);
      const length = parseInt(sgMatch[4], 10);
      const endianCode = sgMatch[5]; // '1' = Intel (little), '0' = Motorola (big)
      const endianness: Endianness = endianCode === '1' ? 'little' : 'big';
      const signCode = sgMatch[6]; // '+' = unsigned, '-' = signed
      const isSigned = signCode === '-';
      const scale = parseFloat(sgMatch[7]);
      const offset = parseFloat(sgMatch[8]);
      const min = parseFloat(sgMatch[9]);
      const max = parseFloat(sgMatch[10]);
      const unit = sgMatch[11] || '';
      const receiver = sgMatch[12] || 'VHAL';

      const signal: CanSignal = {
        id: `${currentMessage.hexId}:${sigName}`,
        name: sigName,
        messageId: currentMessage.id,
        messageName: currentMessage.name,
        startBit,
        length,
        endianness,
        isSigned,
        scale: isNaN(scale) ? 1.0 : scale,
        offset: isNaN(offset) ? 0.0 : offset,
        min: isNaN(min) ? 0.0 : min,
        max: isNaN(max) ? 100.0 : max,
        unit,
        receiver,
        multiplexerIndicator,
      };

      currentMessage.signals.push(signal);
      continue;
    }

    // Check comments
    const cmSgMatch = line.match(cmSgRegex);
    if (cmSgMatch) {
      const msgId = parseInt(cmSgMatch[1], 10) & 0x1fffffff;
      const sigName = cmSgMatch[2];
      const comment = cmSgMatch[3];
      signalComments.set(`${msgId}:${sigName}`, comment);
      continue;
    }

    const cmBoMatch = line.match(cmBoRegex);
    if (cmBoMatch) {
      const msgId = parseInt(cmBoMatch[1], 10) & 0x1fffffff;
      const comment = cmBoMatch[2];
      messageComments.set(msgId, comment);
      continue;
    }
  }

  // Attach comments to messages & signals
  for (const msg of messages) {
    if (messageComments.has(msg.id)) {
      msg.comment = messageComments.get(msg.id);
    }
    for (const sig of msg.signals) {
      const key = `${msg.id}:${sig.name}`;
      if (signalComments.has(key)) {
        sig.comment = signalComments.get(key);
      }
    }
  }

  const totalSignals = messages.reduce((acc, m) => acc + m.signals.length, 0);

  return {
    messages,
    errors,
    totalSignals,
  };
}

export function parseJsonMatrix(jsonContent: string): DbcParseResult {
  try {
    const data = JSON.parse(jsonContent);
    const messages: CanMessage[] = [];
    const errors: string[] = [];

    const rawList = Array.isArray(data) ? data : data.messages || data.frames || [];

    for (const raw of rawList) {
      const id = typeof raw.id === 'string' ? parseInt(raw.id, 16) : Number(raw.id || 0);
      const hexId = `0x${id.toString(16).toUpperCase()}`;
      const name = raw.name || `MSG_${hexId}`;
      const dlc = Number(raw.dlc || 8);
      const sender = raw.sender || 'ECU';

      const signals: CanSignal[] = [];
      const rawSignals = raw.signals || [];

      for (const s of rawSignals) {
        signals.push({
          id: `${hexId}:${s.name}`,
          name: s.name,
          messageId: id,
          messageName: name,
          startBit: Number(s.startBit ?? s.start_bit ?? 0),
          length: Number(s.length ?? s.bit_length ?? 8),
          endianness: (s.endianness === 'big' || s.byte_order === 'motorola') ? 'big' : 'little',
          isSigned: Boolean(s.isSigned ?? s.is_signed),
          scale: Number(s.scale ?? 1.0),
          offset: Number(s.offset ?? 0.0),
          min: Number(s.min ?? 0.0),
          max: Number(s.max ?? 100.0),
          unit: s.unit || '',
          receiver: s.receiver || 'VHAL',
          comment: s.comment || s.description,
        });
      }

      messages.push({
        id,
        hexId,
        name,
        dlc,
        sender,
        signals,
        comment: raw.comment || raw.description,
      });
    }

    const totalSignals = messages.reduce((acc, m) => acc + m.signals.length, 0);
    return { messages, errors, totalSignals };
  } catch (err: any) {
    return {
      messages: [],
      errors: [`Invalid JSON matrix: ${err?.message || 'Parse error'}`],
      totalSignals: 0,
    };
  }
}

export const SAMPLE_POWERTRAIN_DBC = `
VERSION ""

NS_ :
	NS_DESC_
	CM_
	BA_DEF_
	BA_
	VAL_
	CAT_DEF_
	CAT_
	FILTER
	BA_DEF_DEF_
	EV_DATA_
	ENVVAR_DATA_
	SGTYPE_
	SGTYPE_VAL_
	BA_DEF_SGTYPE_
	BA_SGTYPE_
	SIG_TYPE_REF_
	VAL_TABLE_
	SIG_GROUP_
	SIG_VALTYPE_
	SIGTYPE_VALTYPE_
	BO_TX_BU_
	BA_DEF_REL_
	BA_REL_
	BA_DEF_DEF_REL_
	BU_SG_REL_
	BU_EV_REL_
	BU_BO_REL_
	SG_MUL_VAL_

BS_:

BU_: ECM ESC BCM BMS HVAC VHAL

BO_ 420 VehicleDynamics: 8 ESC
 SG_ VehicleSpeed : 7|16@0+ (0.01,0) [0|300] "km/h" VHAL
 SG_ SteeringWheelAngle : 23|16@0- (0.1,0) [-900|900] "deg" VHAL
 SG_ BrakePedalPosition : 39|8@0+ (0.39215686,0) [0|100] "%" VHAL
 SG_ YawRate : 47|16@0- (0.01,0) [-100|100] "deg/s" VHAL
 SG_ AbsActive : 56|1@1+ (1,0) [0|1] "" VHAL
 SG_ TractionControlActive : 57|1@1+ (1,0) [0|1] "" VHAL

BO_ 500 EngineStatus: 8 ECM
 SG_ EngineSpeed : 0|16@1+ (0.25,0) [0|8000] "rpm" VHAL
 SG_ EngineCoolantTemp : 16|8@1+ (1,-40) [-40|215] "C" VHAL
 SG_ EngineOilTemp : 24|8@1+ (1,-40) [-40|215] "C" VHAL
 SG_ AcceleratorPedalPos : 32|8@1+ (0.39215686,0) [0|100] "%" VHAL
 SG_ CurrentGear : 40|4@1+ (1,0) [0|10] "gear" VHAL
 SG_ GearSelectorPosition : 44|4@1+ (1,0) [0|15] "enum" VHAL

BO_ 610 BatteryManagement: 8 BMS
 SG_ HighVoltageBatteryLevel : 0|16@1+ (10,0) [0|100000] "Wh" VHAL
 SG_ BatteryChargeDischargeRate : 16|16@1- (100,0) [-150000|150000] "mW" VHAL
 SG_ ChargePortConnected : 32|1@1+ (1,0) [0|1] "" VHAL
 SG_ ChargePortFlapOpen : 33|1@1+ (1,0) [0|1] "" VHAL
 SG_ MaxAcChargeCurrent : 40|8@1+ (0.5,0) [0|100] "A" VHAL
 SG_ RegenerativeBrakingLevel : 48|4@1+ (1,0) [0|3] "level" VHAL

BO_ 720 BodyControlModule: 8 BCM
 SG_ FrontLeftDoorLocked : 0|1@1+ (1,0) [0|1] "" VHAL
 SG_ DriverWindowPosition : 8|8@1+ (0.39215686,0) [0|100] "%" VHAL
 SG_ TurnSignalState : 16|3@1+ (1,0) [0|4] "enum" VHAL
 SG_ HeadlightsMode : 24|3@1+ (1,0) [0|4] "enum" VHAL
 SG_ HazardLightsActive : 32|1@1+ (1,0) [0|1] "" VHAL
 SG_ ParkingBrakeEngaged : 40|1@1+ (1,0) [0|1] "" VHAL

BO_ 830 ClimateControlStatus: 8 HVAC
 SG_ CabinMeasuredTemp : 0|8@1+ (0.5,-40) [-40|85] "C" VHAL
 SG_ DriverTargetTemp : 8|8@1+ (0.5,-40) [-40|85] "C" VHAL
 SG_ BlowerFanSpeed : 16|4@1+ (1,0) [0|7] "step" VHAL
 SG_ AirConditioningActive : 20|1@1+ (1,0) [0|1] "" VHAL
 SG_ DefrosterRearActive : 21|1@1+ (1,0) [0|1] "" VHAL
 SG_ AirRecirculationActive : 22|1@1+ (1,0) [0|1] "" VHAL

CM_ BO_ 420 "Electronic Stability Controller Broadcast Message";
CM_ SG_ 420 VehicleSpeed "Chassis wheel-derived vehicle speed broadcast";
CM_ SG_ 420 SteeringWheelAngle "Steering column optical absolute angular position";
CM_ BO_ 500 "Engine Management ECU High Priority Status Frame";
CM_ SG_ 500 EngineSpeed "Filtered crankshaft rotational frequency";
CM_ BO_ 610 "EV High Voltage Battery Pack State of Health and Charge";
`;


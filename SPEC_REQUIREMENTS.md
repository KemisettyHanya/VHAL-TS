# Software Requirements Specification (SRS)
## CAN-to-AOSP VHAL Mapper & Reverse Engineering Studio

### 1. System Overview
The application is a browser-executable visual engineering tool for automotive software engineers working with Android Automotive OS (AAOS / AOSP). It bridges vehicle network buses (CAN) with Android Vehicle HAL (AIDL `IVehicle`). It supports both forward synthesis (DBC -> C++) and reverse reconstruction (Legacy C++ -> Visual Canvas Connections).

---

### 2. Functional Requirements

#### 2.1 Source Data Ingestion & Parsers
* **FR-1.1 DBC File Parser:**
  - Parse Vector DBC grammar: `BO_ <ID> <Name>: <DLC> <Sender>` and `SG_ <Name> : <StartBit>|<Length>@<Endian><Sign> (<Scale>,<Offset>) [<Min>|<Max>] "<Unit>" <Receiver>`.
  - Accurately determine Little Endian (`@1+` / Intel) and Big Endian (`@0+` / Motorola).
  - Handle two's-complement signed integers (`-`) and unsigned integers (`+`).
* **FR-1.2 JSON Schema Ingestion:**
  - Fallback import for structured vehicle signal matrices in JSON format.
* **FR-1.3 Pre-loaded Android Automotive AIDL Catalog:**
  - Full catalog of standard AOSP Android 13/14+ `VehicleProperty` values (e.g., `PERF_VEHICLE_SPEED`, `ENGINE_RPM`, `GEAR_SELECTION`, `FUEL_LEVEL`, `PARKING_BRAKE_ON`, `HVAC_TEMPERATURE_SET`).
  - Store metadata per property: AIDL Enum Name, Hex Property ID, DataType (`floatValues`, `int32Values`, `booleanValues`), Default Unit, and Supported `VehicleArea` scope.

#### 2.2 Reverse Engineering Engine (C++ to Visual Graph)
* **FR-2.1 C++ Code Parser:**
  - Accept existing AOSP C++ source code containing CAN frame reception logic (e.g., `onCanFrameReceived(const struct can_frame& frame)`).
  - Parse `switch(frame.can_id)` and `if (frame.can_id == 0x...)` blocks.
  - Extract:
    1. CAN Message ID (e.g., `0x1A4`).
    2. Bit manipulation logic: byte indexing `frame.data[N]`, bit shifts `>> N`, masks `& 0x...`.
    3. Mathematical scaling and offsets applied to extracted raw variables.
    4. Target Android property assignment (e.g., `VehicleProperty::PERF_VEHICLE_SPEED` or numeric property ID).
    5. Unit transformations (e.g., `/ 3.6f` for km/h to m/s conversion).
* **FR-2.2 Canvas Reconstitution:**
  - Automatically instantiate CAN Signal nodes on the left canvas lane.
  - Automatically instantiate matching VHAL Property nodes on the right canvas lane.
  - Re-link and render bezier connection lines between matching ports.
  - Populate custom math/transform popover fields with extracted arithmetic.

#### 2.3 Canvas & Interaction Engine
* **FR-3.1 Layout Architecture:**
  - 3-column layout:
    - Left Column: Searchable source palette (Loaded CAN signals organized by Message/ID).
    - Right Column: Searchable target palette (AOSP Vehicle Properties categorized by domain: Dynamics, Powertrain, HVAC, Body).
    - Center Column: Active Mapping Canvas.
* **FR-3.2 Vertical Dynamic Layout:**
  - Adding a connection or node pair appends to the vertical stack.
  - Canvas height automatically expands (`min-height: 100%`, auto-growing `scrollHeight`).
  - No overlapping: Nodes are sequentially arranged from top to bottom.
* **FR-3.3 High-Capacity Performance:**
  - Canvas must sustain **150 CAN signals + 150 VHAL property cards (300 nodes total)** and 150 active SVG cubic bezier splines simultaneously without frame rate degradation or UI lag during scrolling.
* **FR-3.4 Connection Interaction:**
  - Drag an anchor line from a CAN node output terminal to a VHAL node input terminal.
  - Bezier connector curve updates interactively in real time.
  - Click line to select, modify mathematical conversion formula, or delete connection.

#### 2.4 Code Synthesis Engine (Forward Generator)
* **FR-4.1 C++ / AIDL Compliance:**
  - Generate deterministic, MISRA-compliant C++ code matching AOSP AIDL VHAL patterns:
    - Group logic into `switch(frame.can_id)`.
    - Unpack bytes using explicit bit shifts, masks, and sign extensions matching DBC endianness rules.
    - Compute physical values: `val = (raw * scale) + offset;`.
    - Apply custom transform formula (e.g., unit normalization).
    - Populate `aidl::android::hardware::automotive::vehicle::VehiclePropValue`.
    - Dispatch using `mCallback->onPropertyEvent({ propValue });`.

---

### 3. Non-Functional Requirements
* **NFR-1 Portability:** Zero external runtime backend dependencies. Runs entirely inside modern evergreen browsers.
* **NFR-2 State Persistence:** Workspace exportable/importable as a single JSON file (`vhal_mapping_workspace.json`).
* **NFR-3 Code Safety:** Output C++ must be statically verifiable, contain zero undefined casts, and adhere to `clang-format`.
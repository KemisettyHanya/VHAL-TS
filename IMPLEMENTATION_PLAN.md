# Implementation Plan: CAN-to-AOSP VHAL Mapping Studio

## Architecture Blueprint

+---------------------------------------------------------------------------------------+
|                                    React / Redux / Zustand State                      |
+--------------------------+--------------------------------+---------------------------+
| src/parsers/             | src/components/canvas/         | src/codegen/              |
|  - dbcParser.ts          |  - MappingCanvas.tsx           |  - cppSynthesizer.ts      |
|  - cppReverseParser.ts   |  - SvgConnectorLayer.tsx       |  - cppAstExtractor.ts     |
|  - aospCatalog.ts        |  - NodeCard.tsx                |                           |
+--------------------------+--------------------------------+---------------------------+

## Phase 1: Project Setup & Core Models
- [ ] Initialize project using `npm create vite@latest can-vhal-studio -- --template react-ts`.
- [ ] Install dependencies: `lucide-react`, `tailwind-css`, `clsx`, `zustand`.
- [ ] Define shared TypeScript interfaces in `src/types/automotive.ts`:
  - `CanSignal`, `CanMessage`, `VhalProperty`, `MappingConnection`, `TransformRule`.

## Phase 2: Parsers & Catalog
- [ ] Implement `src/parsers/dbcParser.ts`:
  - Tokenizer for `BO_` (Message ID, DLC) and `SG_` (Bit positions, Endianness, Scale, Offset).
- [ ] Implement `src/parsers/aospCatalog.ts`:
  - Static dictionary of ~100 Android standard AIDL properties with AreaTypes and value variants.
- [ ] Implement `src/parsers/cppReverseParser.ts`:
  - Regular expression and AST-tokenizing engine to parse `onCanFrameReceived(const struct can_frame& frame)`.
  - Extract `switch (frame.can_id)` / `case 0x...` branches.
  - Parse byte reconstruction expressions: `frame.data[X] << Y`.
  - Match mapped `VehicleProperty::<PROP_NAME>` statements and map back to UI connections.

## Phase 3: Vertical Infinite Canvas & SVG Splines
- [ ] Implement `src/components/canvas/MappingCanvas.tsx`:
  - Dynamically calculated height based on connection count: `height = Math.max(containerHeight, nodeCount * 120px)`.
  - Two flex lanes: Left (CAN Node Drop Lane) and Right (VHAL Node Drop Lane).
- [ ] Implement `src/components/canvas/SvgConnectorLayer.tsx`:
  - Dynamically calculate bounding client rectangles of source and target anchor pins.
  - Render SVG paths with cubic bezier formula: `M x1 y1 C (x1+dx) y1, (x2-dx) y2, x2 y2`.
  - Add path click handlers for deletion and property transform modal triggers.
- [ ] Optimize rendering for 150+ connections using CSS transforms and passive scroll listeners.

## Phase 4: Forward Code Generator
- [ ] Implement `src/codegen/cppSynthesizer.ts`:
  - Group all connections by `can_id`.
  - Generate clean, commented switch-case blocks for `onCanFrameReceived`.
  - Compute Little-Endian and Big-Endian byte masks.
  - Append sign extension, physical scaling, and unit normalization factors.
  - Output clean AIDL `VehiclePropValue` serialization matching AOSP guidelines.

## Phase 5: Verification & UI Finalization
- [ ] Add dual upload buttons:
  - `Import DBC / CAN JSON`
  - `Import Existing C++ VHAL Code` (Reverse Engineering)
- [ ] Add code drawer with instant syntax-highlighted preview and "Download .cpp" button.
- [ ] Test reverse-engineering pipeline: Feed sample C++ code and verify nodes and connections populate automatically.
- [ ] Launch Vite dev server, execute browser verification, and export test artifacts.
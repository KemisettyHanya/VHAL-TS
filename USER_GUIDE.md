# CAN-to-AOSP VHAL Studio: User & Deployment Guide

Welcome to the **CAN-to-AOSP VHAL Mapping & Reverse Engineering Studio**. This browser-based engineering tool enables automotive software engineers to bridge Linux SocketCAN frame structures with Android Automotive OS (AAOS / AOSP) AIDL `IVehicle` hardware abstraction layers.

---

## 1. Quick Start (Running on Current System)

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### Launch the Application

From the root project directory (`/home/prasanna/work/Antigravity-VHAL`):

#### Option A: Local Development Mode (Recommended with Hot Reloading)
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5174/
```

#### Option B: Production Build & High-Speed Preview
```bash
npm run build
npm run preview
```
Open your browser and navigate to the preview URL displayed in the terminal (typically `http://localhost:4173/`).

---

## 2. Step-by-Step Guide: Using the Studio & Generating C++ Code

### Workflow 1: Forward Code Synthesis (DBC → Visual Mapping → AOSP C++)

1. **Load CAN Signals**:
   - On the top header, click **Import / Export**.
   - Under the **Import Vector DBC** tab, paste your `.dbc` text or click **Browse .dbc** (you can also click **Load Sample DBC** to immediately populate realistic vehicle dynamics, powertrain, EV battery, and HVAC frames).
   - Click **Parse & Load Signals**. The left palette will populate with categorized CAN messages and signals.

2. **Add Signals and Target Properties to Canvas**:
   - **Left Palette (CAN Signals)**: Expand any CAN message (e.g. `VehicleDynamics 0x1A4`, `EngineStatus 0x1F4`), and click the `+` button on a signal to place its card onto the canvas left lane.
   - **Right Palette (AOSP Properties)**: Filter by domain (e.g. *Dynamics*, *Powertrain*, *HVAC*, *Electrification*) or search by name. Click `+` on an AOSP property (e.g. `PERF_VEHICLE_SPEED`, `ENGINE_RPM`) to place its card onto the canvas right lane.
   - *Tip:* If you loaded a DBC, you can also click **Auto-Map Matching Signals** on the canvas status bar to automatically connect signals with matching names.

3. **Draw Interactive Connections**:
   - Hover over the circular **Output Pin** on the right edge of any CAN signal card.
   - Click and drag an anchor line across to the circular **Input Pin** on the left edge of the desired AOSP property card.
   - A smooth, animated cubic bezier spline will connect them.

4. **Configure Conversion Formulas & Engineering Math**:
   - Along the spline curve, click the **Settings (Gear)** icon on the center pill badge (`f(x)`).
   - The **Mathematical Conversion Formula** modal will open:
     - Choose a standard preset (e.g. `km/h → m/s (raw / 3.6)`, `DegC Offset ((raw * 0.1) - 40)`, `RPM Quad (raw * 0.25)`).
     - Or enter a custom C++ expression using `raw` (e.g. `(raw * 0.01f) / 3.6f`).
     - Test values live in the **Live Equation Evaluator** box to confirm output numbers before generating code.
     - Click **Apply Formula**.

5. **Generate & Download MISRA-Compliant C++ Code**:
   - In the top header bar, click **Generate C++**.
   - The syntax-highlighted code drawer slides open showing the synthesized `CanVhalHalService.cpp`.
   - Configure options:
     - Toggle **DLC Guards** (`if (frame.can_dlc < 8) break;`).
     - Customize the C++ class name (e.g. `CanVhalHalService`).
   - Click **Copy** to copy the source to your clipboard, or click **Download .cpp** to save the file directly to your disk.

---

### Workflow 2: Reverse Engineering Legacy C++ (`onCanFrameReceived`)

1. In the top header bar, click **Reverse C++**.
2. Paste existing vendor VHAL source code (containing `onCanFrameReceived`, `switch(frame.can_id)`, `frame.data[X] << Y`, and `VehicleProperty` assignments), or click **Load Vendor Sample C++**.
3. Click **Quick AST Scan** to inspect detected frames, signals, bit extraction rules, and property bindings.
4. Click **Decompile to Canvas**.
5. The studio will automatically:
   - Reconstruct CAN messages and signal nodes on the left lane.
   - Reconstruct target AOSP properties on the right lane.
   - Draw connecting bezier splines.
   - Populate arithmetic transformation formulas matching the C++ code.

---

### Workflow 3: Running the 150-Node Performance Benchmark (FR-3.3)

1. In the top header bar, click **150-Node Stress Test**.
2. The canvas immediately populates **150 CAN signals + 150 VHAL property cards (300 nodes total)** and **150 active SVG cubic bezier splines**.
3. Observe the **Hardware Perf** monitor in the header maintaining 60 FPS while scrolling through the extensive vertical stack.

---

### Workflow 4: Saving & Restoring Workspaces (Persistence)

1. Click **Import / Export** in the top header.
2. Select **Export Workspace** and click **Download JSON** to save `vhal_mapping_workspace.json`.
3. To resume work on any machine, select **Import Workspace**, upload the JSON file, and click **Restore Workspace**.

---

## 3. Packaging and Deploying to a New System

You can bundle and move this application to any Linux, macOS, or Windows computer with zero backend requirements.

### Step 1: Package the Project on the Source Machine

Run the following command from the workspace root to create a clean archive excluding build artifacts and `node_modules`:

#### On Linux / macOS (Tarball):
```bash
tar --exclude="node_modules" \
    --exclude="dist" \
    --exclude="dist-test" \
    --exclude=".git" \
    -czvf can-vhal-studio.tar.gz .
```

#### On Linux / Windows / macOS (Zip alternative):
```bash
zip -r can-vhal-studio.zip . -x "node_modules/*" "dist/*" "dist-test/*" ".git/*"
```

---

### Step 2: Unpack on the Target System

Transfer the archive (`can-vhal-studio.tar.gz` or `.zip`) to your new system.

#### On Linux / macOS:
```bash
# Create target directory
mkdir -p ~/can-vhal-studio
cd ~/can-vhal-studio

# Extract tarball:
tar -xzvf /path/to/can-vhal-studio.tar.gz
```

#### On Windows (PowerShell or Command Prompt):
Windows 10/11 includes `tar` natively in PowerShell and CMD:
```powershell
# Create target folder
mkdir C:\can-vhal-studio
cd C:\can-vhal-studio

# Extract using built-in Windows tar:
tar -xzvf C:\path\to\can-vhal-studio.tar.gz

# (Alternatively, you can extract with 7-Zip or WinRAR)
```

---

### Step 3: Install & Launch on the Target System

The application runs identically on **Windows**, **Linux**, and **macOS**.

#### 1. Ensure Node.js is installed
Check Node version in your terminal (Linux/macOS) or PowerShell (Windows):
```bash
node -v   # Should be v18.0.0 or higher
npm -v
```
- **Linux:** Install via package manager (`sudo apt install nodejs npm` or via NodeSource).
- **Windows:** Download the official installer from [nodejs.org](https://nodejs.org/) (LTS version).

#### 2. Install dependencies
```bash
npm install
```

#### 3. Run the application
```bash
# Development mode:
npm run dev

# Or build and run production preview:
npm run build
npm run preview
```

Open your browser at `http://localhost:5174` (Edge, Chrome, Firefox, Brave, or Safari).

---

## 4. Verification Test Commands

To verify that the entire parsing and code generation engine is operating correctly on the target machine:

```bash
# Run unit & engine verification suite (DBC, AST reverse engineering, C++ synthesizer):
npx vite build --config vite.config.test.ts && node dist-test/verify_engine.js

# Build production client bundle:
npm run build
```

---

## 5. Project Directory Structure

```
Antigravity-VHAL/
├── index.html                   # HTML entry point
├── package.json                 # Dependencies and build scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration (React + Tailwind CSS)
├── src/
│   ├── main.tsx                 # React application bootstrapper
│   ├── App.tsx                  # Root application layout
│   ├── index.css                # Global Tailwind CSS definitions
│   ├── types/
│   │   └── automotive.ts        # TypeScript definitions for CAN and AOSP AIDL
│   ├── parsers/
│   │   ├── dbcParser.ts         # Vector DBC and JSON matrix ingestion
│   │   ├── aospCatalog.ts       # Pre-loaded standard Android AIDL VehicleProperty catalog
│   │   └── cppReverseParser.ts  # AST/Regex reverse engineering decompiler
│   ├── codegen/
│   │   └── cppSynthesizer.ts    # MISRA-compliant C++ forward generator
│   ├── store/
│   │   └── vhalStore.ts         # Zustand reactive state store
│   └── components/
│       ├── layout/
│       │   └── Header.tsx       # Studio navigation bar and FPS monitor
│       ├── panels/
│       │   ├── CanSignalPalette.tsx    # Left searchable CAN signal palette
│       │   └── VhalCatalogPalette.tsx  # Right searchable AOSP properties palette
│       ├── canvas/
│       │   ├── MappingCanvas.tsx       # Dynamic dual-lane vertical canvas
│       │   ├── SvgConnectorLayer.tsx   # Cubic bezier spline rendering layer
│       │   ├── CanNodeCard.tsx         # CAN Signal card with output terminal
│       │   └── VhalNodeCard.tsx        # AOSP Property card with input terminal
│       └── modals/
│           ├── TransformModal.tsx         # Mathematical conversion formula editor
│           ├── ReverseEngineeringModal.tsx# C++ decompilation studio
│           ├── CodeGenDrawer.tsx          # Live synthesized C++ code viewer & exporter
│           └── ImportExportModal.tsx      # DBC/JSON and workspace session manager
└── scripts/
    ├── verify_engine.ts         # 44-case engine test suite
    └── verify_browser.mjs       # Headless browser Puppeteer verification
```


# Antigravity Task Directive: CAN-to-AOSP VHAL Mapping Studio & Bi-directional C++ Engine

You are assigned to build and verify a complete, zero-backend, browser-based graphical IDE: **CAN-to-AOSP VHAL Mapper & Code Synthesizer**.

### Immediate Objectives
1. Read `SPEC_REQUIREMENTS.md` and `IMPLEMENTATION_PLAN.md`.
2. Initialize a modern Vite + React + TypeScript + Tailwind CSS project in the workspace.
3. Implement the dual-directional pipeline:
   - **Forward Pipeline:** Parse DBC/JSON + AOSP Properties -> Visual Drag-and-Drop Canvas with dynamic SVG connectors -> Generate C++ VHAL translation code.
   - **Reverse Engineering Pipeline:** Upload/Paste existing vendor C++ (`onCanFrameReceived`) -> Extract AST / Regex patterns -> Automatically reconstitute CAN signals, VHAL properties, and visually draw connections on the canvas.
4. Verify performance under load (150 CAN signals + 150 VHAL nodes on a vertically scrolling canvas).
5. Run the dev server, verify browser execution via the headless browser subagent, and capture evidence artifacts of generated and reverse-engineered C++ code.

Proceed autonomously following the implementation phases outlined in `IMPLEMENTATION_PLAN.md`.
# MKRBOX Architecture (Draft)

## Overview

**mkrbox** is a "factory-in-a-box" simulator + game where users issue natural-language goals (e.g. "make cups"), and a simulated MKR (Modular Kinematic Replicator) plans, requests modules/materials, assembles a workcell, and runs continuous manufacturing -- using realistic time with optional fast-forward.

The project has two primary user experiences:

1. **Player Mode (default):**
   - Single web app surface: chat + HUD + level progression + inventory
   - 3D viewport embedded via streaming from a simulator
   - Minimal friction: no CAD required

2. **Creator Mode (advanced):**
   - Local simulator tooling + developer workflow
   - Add/modify levels, modules, and recipes
   - Import custom geometry/assets (USD, meshes)

## Omniverse & Streaming Viewport Architecture

MKRBOX uses NVIDIA Omniverse Kit (and later Isaac Sim) as the authoritative simulator. The player experience is a static React web UI that embeds a streamed viewport using the Embedded Web Viewer pattern; rendering runs inside the Kit application and frames are delivered to the browser via WebRTC. NVIDIA provides a React web viewer sample for streaming Kit apps.

The web UI and simulator communicate via custom JSON messages of the form `{event_type, payload}`. On the web side this is sent through the streaming client's message channel. On the simulator side, the `omni.kit.livestream.messaging` extension bridges these messages into the Kit message bus, and forwards registered outbound events back to the browser.

Conceptual diagram:

```
[Static Web UI (React)]  <--WebRTC video-->  [Kit App (USD/Isaac)]
        |  ^                                   |  ^
        |  | custom JSON messages               |  |
        v  |                                   v  |
  sendMessage({event_type,payload})     Kit message bus events
```

Why this matters: it defines the single-window player UX (chat + HUD + viewport).

### Kit App / Isaac Sim Implementation Plan

Phase A (MVP, easiest):
- Use a Kit app derived from a USD Viewer template.
- Load the MKRBOX scene (USD).
- Enable streaming.
- Add an MKRBOX extension (planner/state machine adapter).
- Keep physics realism cinematic at first.

Phase B (realism ramp):
- Move execution into Isaac Sim for higher-fidelity robotics (IK, sensors, collisions).
- Keep the same web protocol; only the simulator adapter changes.

Licensing constraint:
- Isaac Sim is open source, but redistribution of Omniverse Kit for ISVs requires a separate license.
- The repo should not claim to ship Omniverse inside it; provide scripts that download/install required dependencies.

### Streaming Viewport: Embedded Web Viewer

The web client uses NVIDIA's embedded web viewer pattern to connect to a streamed Kit app. The key limitation: one sim instance streams to one web client at a time (peer-to-peer). Scaling is done by running multiple sim instances (one per session).

Deployment modes:
- Local workstation streaming (developer/player runs the sim locally).
- Hosted GPU instance streaming (public demo / paid sessions).
- Long-term: session-per-user orchestration (containers / OKAS-style), but do not overbuild this in MVP.

### Custom Messaging: Web <-> Kit Event Bridge

On the web side:
- Messages are JSON: `{ event_type, payload }`.
- The web viewer sample uses `AppStreamer.sendMessage(JSON.stringify(...))` for this pattern.

On the Kit side:
- Enable `omni.kit.livestream.messaging` to bridge web custom messages into the Kit message bus and to forward registered events back to the browser.
- Register outbound event types (e.g., `mkrbox_state_update`) so they are forwarded to the web client.
- Use the Kit message bus event stream to subscribe to inbound events and push outbound events.

Message lifecycle example:
- User types: "make cups"
- Web -> send `mkrbox_chat_request` `{text:"make cups"}`
- Kit extension receives `mkrbox_chat_request`
- Planner proposes route + required inputs
- Kit -> emits `mkrbox_plan_proposed` `{...}`
- Kit -> emits `mkrbox_request_inputs` `{...}`
- Web renders plan + "supply inputs" UI
- Web -> send `mkrbox_supply_inputs` `{...}`
- Kit advances state machine -> ASSEMBLING -> CALIBRATING -> RUNNING
- Kit -> emits `mkrbox_state_update` patches frequently

### Network & Security Constraints

- Streaming requires signaling + UDP media ports; defaults can be customized via Kit settings.
- For hosted demos, plan for HTTPS/TLS and basic auth/session gating.
- Networking is a first-class concern for scaling beyond local demos.

## Core Principles

- **Process-first, not geometry-first:** Users vibe-craft by choosing goals and constraints; the system chooses viable manufacturing routes.
- **Capabilities are modular:** Everything is a module (tools, fixtures, sensors, process equipment, compute).
- **Deterministic state machine:** The box behavior is auditable, replayable, and testable.
- **Same protocol everywhere:** The web UI talks to both "toy sim" and "real sim" via the same message schema.
- **Realistic time + fast-forward:** Time advances realistically, with fast-forward allowed only in stable phases.

## System Components

### 1) Web Client (Static React)
**Responsibilities**
- Render UI: chat, inventory, bays, module rack, alarms, timeline, level map
- Render streamed viewport (WebRTC) OR fallback toy viewer
- Send user intent and commands to simulator
- Receive state updates and render them

**Key concepts**
- "Connect" configuration (local sim vs hosted sim)
- Session state (connected/disconnected, sim version, loaded level)
- Game progression (levels, achievements, unlocks)

### 2) Simulator Runtime (Native GPU)
This is the authoritative "world" that:
- Loads the MKRBOX scene
- Runs time, kinematics, and (eventually) physics/sensors
- Executes plans into actions
- Emits telemetry and state

Implementation will likely start as:
- A Kit-based app (USD viewer-style) + custom extension(s)
Then optionally evolve into:
- Isaac Sim for higher robotics realism

### 3) MKR Brain (Planner + State Machine)
**Responsibilities**
- Interpret user intent into a goal
- Evaluate feasible manufacturing routes based on available materials + modules
- Generate a plan (phases, actions, checks)
- Request missing modules/materials
- Drive execution and handle failures/recovery
- Emit explanation text for chat + structured HUD updates

**Design goals**
- Keep planner logic as *pure Python* (or at least simulator-agnostic)
- Simulator adapters translate abstract actions -> sim-specific operations

### 4) Content Packs
Everything "game-like" lives in versioned content:

- **Levels**: starting inventory, constraints, success criteria, scoring
- **Recipes/Routes**: e.g. wood-turning cup, foam milling bowl, clay slip-cast cup
- **Modules**: toolheads, clamps, sensors, kiln, dust collection, etc.
- **Assets**: USD/meshes/textures for tools, materials, outputs

## Data Model

### MKR State (authoritative)
A single source of truth describing:
- Current phase (IDLE, PLANNING, WAITING_FOR_INPUTS, ASSEMBLING, CALIBRATING, RUNNING, ERROR, OUTPUT_FULL)
- Inventory: raw materials, modules, tools, consumables
- Installed modules (and health/calibration)
- Active job (goal, selected route, throughput)
- Output bay fill level
- Time (sim time vs wall time), fast-forward factor, stability flag
- Alarms / warnings / maintenance needs

### Levels
Each level defines:
- Initial world state (inventory, installed modules, damage, environment)
- Objective(s): "produce N cups at >=Q quality"
- Constraints: time limit, allowed modules, energy, waste
- Scoring: throughput, waste, quality, downtime, safety

### Routes / Processes
A route is a manufacturing strategy:
- Preconditions (materials, modules, tools, tolerances)
- Phases (setup, calibration, operation, finishing)
- Estimated throughput + waste
- Common failure modes (tool wear, drift, overheating, misclamp)

## Message Protocol (Web <-> Simulator)

All messages are JSON:

```json
{
  "event_type": "string",
  "payload": { "any": "object" }
}
```

Required Event Types (MVP)

Client -> Sim

mkrbox_connect: { clientVersion, userId? }

mkrbox_set_level: { levelId }

mkrbox_chat_request: { text, sessionId }

mkrbox_confirm_plan: { planId }

mkrbox_supply_inputs: { items:[{id,qty}] }

mkrbox_set_timewarp: { factor } // 1x, 2x, 10x, 100x

mkrbox_pause / mkrbox_resume

mkrbox_emergency_stop

Sim -> Client

mkrbox_chat_response: { text, tone?, suggestions? }

mkrbox_state_update: { state } // full or partial patches

mkrbox_request_inputs: { items, reason, blocking }

mkrbox_plan_proposed: { planId, routeOptions, chosenRoute, steps, estimates }

mkrbox_alarm: { severity, code, message, recommendedActions }

mkrbox_level_result: { success, score, breakdown, unlocks }

Protocol Rules

Simulator is authoritative: the client never mutates state directly.

Client requests are validated against current phase.

mkrbox_state_update should be frequent and small (patches) during RUNNING.

Fast-forward is only allowed when state.stable == true.

Execution Model
Planner Pipeline

Parse intent -> goal object

Query inventory + installed modules -> capability graph

Generate candidate routes (ranked)

Choose route or ask user to pick

Emit plan proposal

Await confirmation (or auto-confirm for beginner mode)

Execute plan via state machine

State Machine Phases (MVP)

IDLE

PLANNING

WAITING_FOR_INPUTS

ASSEMBLING (mount tools/modules/fixtures)

CALIBRATING (sensor checks + dry run)

RUNNING (continuous production loop)

OUTPUT_FULL

ERROR (recoverable vs fatal)

PAUSED / E-STOP

Simulation Layers (incremental realism)
Layer 0: "Cinematic" Sim (fastest)

No rigid-body physics requirement

Motion as scripted animation

Material transforms are event-driven (spawn output items)

Failure modes are logical (tool wear timers, drift, misclamp probability)

Layer 1: Kinematics + basic collisions

Arm IK + joint limits

Simple collision constraints and bounding-box checks

Layer 2: Sensor realism

Camera overlays, force/torque sensing, calibration drift

Perception errors and maintenance tasks

Layer 3: Process realism

Subtractive toolpaths, thermal models, kiln cycles, curing times

Quality metrics based on process conditions

Repository Layout (proposed)
/web/                         # React viewer + HUD
/sim/                         # Simulator app + extensions
  /app/                       # Kit app config, .kit file, launch scripts
  /extensions/mkrbox.bridge/  # Messaging + protocol adapter
  /extensions/mkrbox.core/    # Planner + state machine (sim-agnostic)
  /extensions/mkrbox.scene/   # Scene ops (spawn, attach, animate)
/content/
  /levels/
  /routes/
  /modules/
  /assets/
/shared/
  /protocol/                  # JSON schema/types for messages
  /types/                     # shared TS/Python models
/scripts/
  bootstrap.sh
  run-sim.sh
  run-web.sh
/docs/
  ARCHITECTURE.md
  SIM_QUICKSTART.md

Planner/state machine logic should not depend heavily on Kit APIs; keep it portable.
Only the adapter and scene ops should be Kit-specific.

Testing Strategy

Unit tests for planner, route selection, state machine transitions

Golden replays: deterministic logs of messages and state patches

Contract tests: protocol schema validation (TS + Python)

Sim smoke tests: headless sim boot + "level01 produces 1 item"

UI tests: basic connection flow + rendering state updates

Safety + Constraints (future-facing, but plan now)

Even in simulation, model safety constraints:

E-stop always available

Guard rails in planner: no unsafe tool combos

"Stability required" for timewarp

Clear user confirmation for risky plans (high waste / high failure probability)

Milestones

MVP-1: Chat -> plan -> request inputs -> run -> output items (cinematic)

MVP-2: Levels + scoring + unlocks

MVP-3: Creator mode content editing + asset import path

MVP-4: Increased realism (Isaac integration, sensors, process models)

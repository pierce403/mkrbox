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
/web/                     # Static React game UI
/sim/                     # Simulator app + extensions
  /extensions/mkrbox.core/ # MKR brain adapter + message bridge
  /extensions/mkrbox.sim/  # Scene ops (spawn, attach, animate)
/content/
  /levels/
  /routes/
  /modules/
  /assets/
/shared/
  /protocol/              # JSON schema/types for messages
  /types/                 # shared TS/Python models
/scripts/
  bootstrap.sh
  run-sim.sh
  run-web.sh
/docs/
  ARCHITECTURE.md
  SIM_QUICKSTART.md

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

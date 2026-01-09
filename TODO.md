# TODO.md

## Goal
Ship a playable "vibe craft" experience:
- User opens the app, sees the MKRBOX, types "make cups"
- MKR proposes a plan, requests raw materials/modules
- User supplies inputs (simulated inventory)
- MKR assembles + calibrates
- Continuous production runs in realistic time with fast-forward
- Output bay fills; user completes the level

---

## P0 — Skeleton (must exist for anything else)

### Repo structure
- [x] Create folders: `/app`, `/sim`, `/content`, `/shared`, `/scripts`, `/docs`
- [x] Add `ARCHITECTURE.md`, `SIM_QUICKSTART.md`, `TODO.md`
- [ ] Add basic license + contributing docs

### Shared protocol
- [x] Define message types in `/shared/protocol` (JSON schema + TS/Python types)
- [ ] Add versioning (`protocolVersion`) and compatibility checks
- [ ] Implement schema validation on both ends

---

## P1 — Web UI MVP (static React)

### Core pages
- [ ] Landing page improvements (clear CTA: Watch demo / Run locally / Creator mode)
- [x] `/play` page: viewport + chat + HUD (mock sim in `/app`)
- [ ] `/levels` page: level selection + locked/unlocked states
- [ ] `/docs` page: concept + how it works (non-technical)

### UI components
- [x] Chat panel w/ system + user messages
- [ ] Inventory panel (raw materials, tools, modules, consumables)
- [ ] Bays view (input bay / output bay)
- [x] MKR status strip (phase, throughput, stable flag, alarms)
- [ ] Time controls (pause/resume, timewarp factor)
- [x] Plan proposal modal (route options + estimates + confirm)

### Connection layer
- [ ] “Connect to sim” settings (localhost by default)
- [x] WebRTC stream embed (or stub container while sim not ready)
- [ ] Message send/receive hooks with reconnection + error UI

---

## P2 — Simulator MVP (cinematic execution)

### Sim bring-up
- [x] Scaffold Kit app + extension skeletons (nonfunctional)
- [ ] Minimal simulator app that loads the MKRBOX scene
- [ ] Message bridge: receive `mkrbox_chat_request` -> respond
- [ ] Periodic `mkrbox_state_update` tick

### MKR brain MVP
- [ ] State machine scaffolding with phases
- [ ] Planner stub: "make cups" chooses route from inventory
- [ ] Plan proposal output (steps, estimates)
- [ ] Inputs request system (missing modules/materials)

### Execution loop
- [ ] "Assemble" phase animations (attach module/tools in scene)
- [ ] "Calibrate" phase (timed steps, stable flag)
- [ ] "Run" phase:
  - [ ] produce one item per cycle
  - [ ] increment output bay
  - [ ] tool wear timer + simple failure chance
- [ ] "Output full" stopping condition

### Time + fast-forward
- [ ] Sim time abstraction (simTime, wallTime, timewarpFactor)
- [ ] Stability gating: timewarp only when stable
- [ ] Auto-drop to 1x on alarm/failure

---

## P3 — First content pack (levels/routes/modules)

### Level 01: Wood cups from blanks
- [ ] Starting inventory: wooden cylinders, clamp, cutter
- [ ] Goal: produce N cups at >= quality threshold
- [ ] Score: waste + time + rejects
- [ ] Failure modes: misclamp, dull tool, chatter

### Route: "Wood cup via subtractive milling/turning"
- [ ] Preconditions + required modules/tools
- [ ] Estimated throughput + waste
- [ ] Phases: clamp -> rough shape -> bore -> finish

### Modules (MVP set)
- [ ] Basic gripper
- [ ] Clamp/fixture module
- [ ] Spindle/rotary "lathe mode" (cinematic initially)
- [ ] Tool rack / tool changer (visual only initially)
- [ ] Basic camera overlay (HUD only)

---

## P4 — Game structure & progression

- [ ] Level progression + unlock system
- [ ] Rewards: new modules, tools, materials
- [ ] Achievements (first production run, no rejects, etc.)
- [ ] "Repair events" (mini tasks): recalibrate, replace tool, clear jam

---

## P5 — Creator mode (for contributors)

- [ ] Content authoring guide (`CONTENT_AUTHORING.md`)
- [ ] Hot-reload of levels/routes (dev convenience)
- [ ] Asset import guide (USD/meshes)
- [ ] Route authoring validation tool (lint schemas + run a dry plan)

---

## P6 — Realism upgrades (later)

- [ ] Isaac Sim migration plan (when needed)
- [ ] Kinematics + joint limits
- [ ] Collisions + safety envelopes
- [ ] Sensor realism: drift + noise + calibration routines
- [ ] Process realism: toolpaths, thermal models, kiln cycles

---

## Automation & CI

- [ ] Lint + typecheck (app + python)
- [ ] Unit tests for planner/state machine
- [ ] Protocol contract tests
- [ ] Smoke test: boot sim headless + complete Level 01 with 1 item

---

## Documentation (ongoing)

- [ ] `README.md` with "What is MKRBOX?" + quickstart
- [ ] `SIM_QUICKSTART.md` with local run steps
- [ ] `MODULES.md`, `LEVELS.md`, `ROUTES.md`
- [ ] Website copy: concept page + FAQ ("why not in-browser sim?")

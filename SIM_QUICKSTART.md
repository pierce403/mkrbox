# MKRBOX Simulator Quickstart (Draft)

This document defines the intended "clone -> run sim -> connect web client -> play levels" flow.
It is aligned with NVIDIA's Embedded Web Viewer + Kit/Isaac streaming approach.

## 0) What you're running (mental model)
- Simulator (native, GPU): a Kit/Isaac-based app that renders the MKRBOX workcell and exposes WebRTC streaming + messaging.
- Web UI (static React): the game HUD + chat + level selector, which connects to the sim via the NVIDIA Web Viewer pattern.

## 1) Prerequisites (one-time)
### Hardware / drivers
- Use an NVIDIA GPU + driver compatible with current Omniverse/Kit streaming.
- Windows only: disable Hardware-accelerated GPU scheduling (prevents streaming freezes/perf issues).

### Dev tools
- Install Git LFS (required for USD assets).
- Install Node.js v18+ and npm (required for the web viewer).
- Use a Chromium browser (Chrome/Edge) for the web client.

### If you run the sim in Docker
- Install Docker + NVIDIA Container Toolkit (needed for GPU-accelerated containers).
- Create an NVIDIA NGC account (required to pull Isaac Sim containers).

What is NGC?
- NVIDIA NGC (NVIDIA GPU Cloud) is NVIDIA’s container registry and catalog.
- Sign in: https://ngc.nvidia.com/signin
- NGC overview: https://docs.nvidia.com/ngc/ngc-overview/index.html

NGC login steps (one-time):
1. Create an NVIDIA account and sign in to NGC.
2. Generate an NGC API key: https://org.ngc.nvidia.com/setup/api-key
3. Login to the container registry:
   ```bash
   docker login nvcr.io
   # username: $oauthtoken
   # password: <your NGC API key>
   ```

If you're new to Omniverse/Kit, use **container mode** first. It keeps the setup to Docker + NVIDIA drivers.

## 2) Clone the repo
```bash
git lfs install
git clone <YOUR_MKRBOX_REPO_URL>
cd <repo>
```

Repo goal: fail fast with a friendly message if Git LFS isn't installed.

## 3) Bootstrap everything from the repo (one command)
Goal: "clone repo -> run one bootstrap script -> it installs/sets up everything needed."

Planned script:
```bash
./bootstrap.sh --auto
```

The bootstrap script should:
- verify Node >= 18
- verify Git LFS is installed
- verify NVIDIA driver presence (print a link to Omniverse technical requirements; do not hardcode versions)
- fetch/install the sim runtime
  - Option A (Kit App Template-based app): download Kit SDK dependencies and build the app
  - Option B (Isaac Sim container): pull the image and prep run scripts (see step 4B)
- install app deps: `cd app && npm ci`
Tip: use `--mode=container` if you want to force Isaac Sim container checks.

If bootstrap stops, it prints the exact manual steps to finish setup.

## 4) Run the simulator
Support two modes: Workstation (native app) and Container.

### 4A) Workstation mode (Kit app / USD Viewer-derived)
Start the sim from repo root:
```bash
./run-sim.sh
```

First boot can take time. NVIDIA notes to wait until the viewport shows a black background before starting the web client.

Headless mode (optional, for hosted sessions):
```bash
./run-sim.sh --headless
```

Implementation detail: pass `-no-window` to the built `.kit.sh` / `.kit.bat` launch command.

### 4B) Container mode (Isaac Sim)
Pull the container once:
```bash
docker pull nvcr.io/nvidia/isaac-sim:<version>
```

Note: there is no `:latest` tag. You must use an explicit version tag from NGC.

Run it (must accept EULA via env var):
```bash
docker run --gpus all --rm \
  -e "ACCEPT_EULA=Y" \
  nvcr.io/nvidia/isaac-sim:<version>
```

Repo goal: wrap this in `./run-sim-container.sh` so users don't need to remember flags.
Or use:
```bash
./run-sim.sh --container --image nvcr.io/nvidia/isaac-sim:<version>
```
Or pull+run in one step:
```bash
./run-sim-container.sh --pull --image nvcr.io/nvidia/isaac-sim:<version>
```

## 5) Run the web client (game UI)
In a second terminal:
```bash
cd app
npm run dev
```
Or use:
```bash
./run-app.sh
```

Logs are written to `./logs/` (app logs + sim logs).

Before first use, replace `app/public/omniverse/appstreamer.js` with the official
Embedded Web Viewer client bundle. The placeholder file will otherwise report
\"AppStreamer client missing\" in the UI.

Then open the printed URL in Chrome/Edge.

Note: the reference solution is peer-to-peer; one sim instance streams to one browser client. Multiple tabs will conflict.

## 6) Connect the web UI to the sim
The web UI should read a config like `app/stream.config.json` and default to `127.0.0.1` for local.

The UI should display:
- "Connected" status
- sim framerate / latency
- sim version + loaded level id

## 7) Play levels (minimum viable loop)
The repo should include level files like:
```
levels/level01-boot.yaml
levels/level02-sensors.yaml
levels/level03-toolchange.yaml
```

Support both ways to start a level:

### Option A: Start from web UI
Level selector calls:
```js
sendMessage({
  event_type: "mkrbox_set_level",
  payload: { levelId }
});
```

Kit sim replies with `mkrbox_state_update`.

### Option B: Start from CLI
Allow:
```bash
./run-sim.sh --level level01-boot
```

Which passes a Kit setting like:
```
--/mkrbox/level=level01-boot
```

## 8) Streaming from one machine to another (LAN / remote)
If the sim runs on one machine and the browser runs on another, open:
- 49100/tcp (signaling)
- 1024:65535/udp (media)

Example (Ubuntu ufw):
```bash
sudo ufw allow 49100/tcp
sudo ufw allow 1024:65535/udp
sudo ufw reload
```

Then change `app/stream.config.json` to the sim machine's IP.

Ports can be customized via `.kit` settings / command-line flags.

## 9) "It doesn't work" checklist (fastest fixes)
1. Close the browser tab.
2. Stop the web dev server.
3. Stop the sim.
4. Start the sim again and wait for the black viewport.
5. Start the web client again and reload.

If still broken:
- check browser console errors
- check Kit logs for streaming errors

---

Want this expanded into actual scripts + a starter web client? Add:
- `bootstrap.sh`, `run-sim.sh`, `run-app.sh`
- `app/stream.config.json` template + "Connect" UI

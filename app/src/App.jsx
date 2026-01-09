import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createMockSim } from './mockSim'
import { connectStream } from './streaming/appStreamerClient'

const LEVELS = [
  { id: 'level01-boot', name: 'Level 01: Boot Sequence' },
  { id: 'level02-sensors', name: 'Level 02: Sensor Suite' },
  { id: 'level03-toolchange', name: 'Level 03: Tool Change' },
]

function App() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'MKRBOX ready. Type a goal like “make cups”.' },
  ])
  const [simState, setSimState] = useState({
    phase: 'DISCONNECTED',
    levelId: LEVELS[0].id,
    stable: false,
    outputBay: { count: 0, capacity: 5 },
    time: { simTime: 0, timewarp: 1 },
  })
  const [plan, setPlan] = useState(null)
  const [inputRequest, setInputRequest] = useState(null)
  const [connected, setConnected] = useState(false)
  const [draft, setDraft] = useState('')
  const [simHost, setSimHost] = useState(() => {
    return localStorage.getItem('mkrbox.simHost') || '127.0.0.1'
  })
  const [simPort, setSimPort] = useState(() => {
    return localStorage.getItem('mkrbox.simPort') || '49100'
  })
  const [streamStatus, setStreamStatus] = useState('idle')
  const streamRef = useRef(null)
  const streamHandleRef = useRef(null)
  const [showHelp, setShowHelp] = useState(false)

  const sim = useMemo(() => {
    return createMockSim((event) => {
      if (event.event_type === 'mkrbox_state_update') {
        setSimState(event.payload.state)
      }
      if (event.event_type === 'mkrbox_chat_response') {
        setMessages((prev) => [...prev, { role: 'system', text: event.payload.text }])
      }
      if (event.event_type === 'mkrbox_plan_proposed') {
        setPlan(event.payload)
      }
      if (event.event_type === 'mkrbox_request_inputs') {
        setInputRequest(event.payload)
      }
      if (event.event_type === 'mkrbox_level_result') {
        setMessages((prev) => [
          ...prev,
          { role: 'system', text: `Level complete. Score: ${event.payload.score}` },
        ])
      }
    })
  }, [])

  useEffect(() => {
    sim.connect()
    setConnected(true)
    return () => {
      sim.dispose()
    }
  }, [sim])

  useEffect(() => {
    localStorage.setItem('mkrbox.simHost', simHost)
  }, [simHost])

  useEffect(() => {
    localStorage.setItem('mkrbox.simPort', simPort)
  }, [simPort])

  useEffect(() => {
    return () => {
      if (streamHandleRef.current) {
        streamHandleRef.current.disconnect()
      }
    }
  }, [])

  const sendMessage = (event) => {
    sim.handleMessage(event)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [...prev, { role: 'user', text }])
    sendMessage({ event_type: 'mkrbox_chat_request', payload: { text } })
    setDraft('')
  }

  const handleSupplyInputs = () => {
    if (!inputRequest) return
    sendMessage({
      event_type: 'mkrbox_supply_inputs',
      payload: { items: inputRequest.items },
    })
    setInputRequest(null)
  }

  const handleLevelChange = (event) => {
    const levelId = event.target.value
    sendMessage({ event_type: 'mkrbox_set_level', payload: { levelId } })
    setPlan(null)
    setInputRequest(null)
  }

  const handleConnectStream = () => {
    if (!streamRef.current) return
    if (streamHandleRef.current) {
      streamHandleRef.current.disconnect()
    }
    setStreamStatus('connecting')
    const result = connectStream({
      host: simHost,
      port: simPort,
      container: streamRef.current,
    })
    streamHandleRef.current = result
    setStreamStatus(result.status)
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="kicker">MKRBOX · Simulator</p>
          <h1>Playable Loop (Mock Sim)</h1>
        </div>
        <div className="status">
          <span className={`dot ${connected ? 'live' : ''}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <div className="main-grid">
        <section className="panel chat-panel">
          <h2>Command Console</h2>
          <div className="chat-log">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`chat-line ${msg.role}`}>
                <span>{msg.role === 'user' ? 'You' : 'MKRBOX'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a goal (e.g., make cups)"
            />
            <button type="submit">Send</button>
          </form>
        </section>

        <section className="panel viewport-panel">
          <h2>Viewport</h2>
          <div className="viewport-shell">
            <div className="viewport-placeholder" ref={streamRef}>
              <p>Streaming viewport will render here.</p>
              <p className="muted">Mock sim is active until Omniverse is connected.</p>
            </div>
            <div className="stream-status">
              <span className={`dot ${streamStatus === 'connected' ? 'live' : ''}`} />
              <span>
                {streamStatus === 'missing' && 'AppStreamer client missing'}
                {streamStatus === 'connecting' && 'Connecting to stream...'}
                {streamStatus === 'connected' && 'Stream connected'}
                {streamStatus === 'error' && 'Stream error'}
                {streamStatus === 'idle' && 'Stream idle'}
              </span>
            </div>
          </div>
          <div className="connect-panel">
            <h3>Connect to remote simulator</h3>
            <p>
              If the sim is running on another machine (like a DGX), enter its IP
              here. On the sim machine run:
            </p>
            <div className="command-grid">
              <div>
                <span>Linux</span>
                <code>hostname -I | awk '{print $1}'</code>
              </div>
              <div>
                <span>macOS</span>
                <code>ipconfig getifaddr en0</code>
              </div>
              <div>
                <span>Windows</span>
                <code>ipconfig</code>
              </div>
            </div>
            <div className="connect-fields">
              <label>
                Sim host
                <input
                  value={simHost}
                  onChange={(event) => setSimHost(event.target.value)}
                  placeholder="127.0.0.1"
                />
              </label>
              <label>
                Sim port
                <input
                  value={simPort}
                  onChange={(event) => setSimPort(event.target.value)}
                  placeholder="49100"
                />
              </label>
            </div>
            <button type="button" onClick={handleConnectStream}>
              Connect stream
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setShowHelp(true)}
            >
              Remote setup help
            </button>
            <p className="muted">
              When streaming is enabled, the client will connect to {simHost}:{simPort}.
            </p>
          </div>
          <div className="control-row">
            <label>
              Level
              <select value={simState.levelId} onChange={handleLevelChange}>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Phase
              <input value={simState.phase} readOnly />
            </label>
          </div>
        </section>

        <section className="panel state-panel">
          <h2>Session State</h2>
          <div className="state-grid">
            <div>
              <h3>Output bay</h3>
              <p>
                {simState.outputBay.count} / {simState.outputBay.capacity} items
              </p>
            </div>
            <div>
              <h3>Time</h3>
              <p>
                {simState.time.simTime}s · {simState.time.timewarp}x
              </p>
            </div>
            <div>
              <h3>Stability</h3>
              <p>{simState.stable ? 'Stable' : 'Unstable'}</p>
            </div>
          </div>

          {plan && (
            <div className="card">
              <h3>Plan proposed</h3>
              <p>{plan.summary}</p>
              <ul>
                {plan.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {inputRequest && (
            <div className="card">
              <h3>Inputs requested</h3>
              <ul>
                {inputRequest.items.map((item) => (
                  <li key={item.id}>
                    {item.qty}x {item.id}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={handleSupplyInputs}>
                Supply inputs
              </button>
            </div>
          )}
        </section>
      </div>
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Remote simulator setup</h2>
              <button type="button" onClick={() => setShowHelp(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <p>
                Use this when your simulator runs on another machine (like a DGX) and the
                laptop runs the web app.
              </p>
              <div className="step-grid">
                <div className="step-card">
                  <h3>Step 1 — Start the sim on the DGX</h3>
                  <p>Run the simulator on the remote GPU machine.</p>
                  <code>./run-sim.sh --container --image nvcr.io/nvidia/isaac-sim:&lt;version&gt;</code>
                  <div className="shot">Screenshot: terminal showing sim boot</div>
                </div>
                <div className="step-card">
                  <h3>Step 2 — Find the sim machine IP</h3>
                  <p>Run the command that matches your OS.</p>
                  <div className="command-grid">
                    <div>
                      <span>Linux</span>
                      <code>hostname -I | awk '{print $1}'</code>
                    </div>
                    <div>
                      <span>macOS</span>
                      <code>ipconfig getifaddr en0</code>
                    </div>
                    <div>
                      <span>Windows</span>
                      <code>ipconfig</code>
                    </div>
                  </div>
                  <div className="shot">Screenshot: IP highlighted in terminal</div>
                </div>
                <div className="step-card">
                  <h3>Step 3 — Enter host + port</h3>
                  <p>
                    Put the IP into the “Sim host” field. Default streaming port is 49100.
                  </p>
                  <div className="shot">Screenshot: host + port fields filled</div>
                </div>
                <div className="step-card">
                  <h3>Step 4 — Connect from the app</h3>
                  <p>Click “Connect stream” and watch the viewport come alive.</p>
                  <div className="shot">Screenshot: stream connected badge</div>
                </div>
              </div>
              <p className="muted">
                If the stream doesn’t connect, check firewall rules and confirm the sim
                machine is reachable on your LAN.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

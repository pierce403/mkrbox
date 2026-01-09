import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createMockSim } from './mockSim'

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
          <div className="viewport-placeholder">
            <p>Streaming viewport will render here.</p>
            <p className="muted">Mock sim is active until Omniverse is connected.</p>
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
    </div>
  )
}

export default App

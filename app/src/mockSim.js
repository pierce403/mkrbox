const DEFAULT_LEVEL = 'level01-boot'

const baseState = () => ({
  phase: 'IDLE',
  levelId: DEFAULT_LEVEL,
  stable: true,
  outputBay: { count: 0, capacity: 5 },
  time: { simTime: 0, timewarp: 1 },
})

export function createMockSim(emit) {
  let state = baseState()
  let simTimeInterval = null
  let runInterval = null
  const timers = new Set()

  const schedule = (fn, delay) => {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, delay)
    timers.add(id)
    return id
  }

  const clearTimers = () => {
    timers.forEach((id) => clearTimeout(id))
    timers.clear()
    if (runInterval) clearInterval(runInterval)
    if (simTimeInterval) clearInterval(simTimeInterval)
    runInterval = null
    simTimeInterval = null
  }

  const emitState = () => {
    emit({ event_type: 'mkrbox_state_update', payload: { state: { ...state } } })
  }

  const setPhase = (phase, stable = false) => {
    state = { ...state, phase, stable }
    emitState()
  }

  const startClock = () => {
    if (simTimeInterval) return
    simTimeInterval = setInterval(() => {
      state = {
        ...state,
        time: {
          ...state.time,
          simTime: state.time.simTime + 1,
        },
      }
      emitState()
    }, 1000)
  }

  const stopClock = () => {
    if (simTimeInterval) clearInterval(simTimeInterval)
    simTimeInterval = null
  }

  const startRun = () => {
    setPhase('RUNNING', true)
    startClock()
    runInterval = setInterval(() => {
      const nextCount = state.outputBay.count + 1
      state = {
        ...state,
        outputBay: { ...state.outputBay, count: nextCount },
      }
      emitState()
      if (nextCount >= state.outputBay.capacity) {
        clearTimers()
        setPhase('OUTPUT_FULL', true)
        emit({
          event_type: 'mkrbox_level_result',
          payload: { success: true, score: 92, breakdown: {} },
        })
      }
    }, 2200)
  }

  const proposePlan = (text) => {
    const planId = `plan-${Date.now()}`
    emit({
      event_type: 'mkrbox_plan_proposed',
      payload: {
        planId,
        summary: `Plan to produce cups using the baseline toolchain.`,
        steps: ['Mount clamp module', 'Calibrate spindle', 'Run production loop'],
      },
    })
    emit({
      event_type: 'mkrbox_request_inputs',
      payload: {
        reason: 'Missing inputs for plan execution',
        blocking: true,
        items: [
          { id: 'wooden-blank', qty: 6 },
          { id: 'clamp-module', qty: 1 },
          { id: 'spindle-tool', qty: 1 },
        ],
      },
    })
    emit({
      event_type: 'mkrbox_chat_response',
      payload: {
        text: `Received: "${text}". Proposed a plan and requested inputs.`,
      },
    })
  }

  const handleMessage = (event) => {
    if (!event || !event.event_type) return
    switch (event.event_type) {
      case 'mkrbox_connect':
        emit({ event_type: 'mkrbox_chat_response', payload: { text: 'Sim connected.' } })
        emitState()
        break
      case 'mkrbox_set_level':
        clearTimers()
        state = { ...baseState(), levelId: event.payload.levelId }
        emitState()
        emit({
          event_type: 'mkrbox_chat_response',
          payload: { text: `Loaded ${event.payload.levelId}.` },
        })
        break
      case 'mkrbox_chat_request':
        setPhase('PLANNING', false)
        schedule(() => {
          proposePlan(event.payload.text)
          setPhase('WAITING_FOR_INPUTS', false)
        }, 600)
        break
      case 'mkrbox_supply_inputs':
        setPhase('ASSEMBLING', false)
        schedule(() => setPhase('CALIBRATING', false), 1200)
        schedule(() => startRun(), 2400)
        break
      case 'mkrbox_emergency_stop':
        clearTimers()
        stopClock()
        setPhase('ERROR', false)
        emit({ event_type: 'mkrbox_chat_response', payload: { text: 'E-stop triggered.' } })
        break
      default:
        break
    }
  }

  const connect = () => {
    emit({ event_type: 'mkrbox_chat_response', payload: { text: 'Mock sim online.' } })
    emitState()
  }

  const dispose = () => {
    clearTimers()
  }

  return { connect, handleMessage, dispose }
}

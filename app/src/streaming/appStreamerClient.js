export function getAppStreamerGlobal() {
  if (typeof window === 'undefined') return null
  return (
    window.AppStreamer ||
    window.appStreamer ||
    window.OmniverseAppStreamer ||
    null
  )
}

export function connectStream({ host, port, container }) {
  const AppStreamer = getAppStreamerGlobal()
  if (!AppStreamer) {
    return {
      status: 'missing',
      disconnect: () => {},
    }
  }

  let instance = null
  try {
    if (typeof AppStreamer.connect === 'function') {
      instance = AppStreamer.connect({ host, port, container })
    } else if (typeof AppStreamer === 'function') {
      instance = new AppStreamer({ host, port, container })
    } else if (AppStreamer.AppStreamer) {
      instance = new AppStreamer.AppStreamer({ host, port, container })
    }

    if (instance && typeof instance.connect === 'function') {
      instance.connect()
    }

    return {
      status: 'connected',
      disconnect: () => {
        if (instance && typeof instance.disconnect === 'function') {
          instance.disconnect()
        }
      },
    }
  } catch (error) {
    console.error('Failed to connect AppStreamer', error)
    return {
      status: 'error',
      disconnect: () => {},
    }
  }
}

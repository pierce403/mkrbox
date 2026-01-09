# MKRBOX Bridge Extension (Draft)

Responsibilities:
- Bridge custom web viewer messages into the Kit message bus.
- Forward registered MKRBOX events back to the web client.

This extension will wire up `omni.kit.livestream.messaging` and register the
MKRBOX event types defined in `shared/protocol`.

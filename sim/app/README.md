# MKRBOX Kit App (Draft)

This folder holds the Kit app configuration for the MKRBOX simulator.

- `mkrbox.app.kit` is a minimal Kit config that enables streaming + messaging.
- The app expects MKRBOX extensions to live under `../extensions`.

## Requirements
Set `KIT_ROOT` to your Kit SDK install (or a Kit-based app install). The run script
will look for `kit` or `kit.sh` under that path.

Example:
```bash
export KIT_ROOT=/path/to/kit-sdk
./scripts/run-sim.sh
```

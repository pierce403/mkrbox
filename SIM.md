# MKRBOX Simulation (Draft)

## Overview
The MKRBOX repo includes simulator logic, levels, and assets. The setup flow downloads NVIDIA
simulation dependencies (Kit/Isaac) and asks you to accept NVIDIA terms during install.

## Prerequisites
- RTX-capable GPU.
- Modern Linux or Windows workstation.
- Enough storage for simulation assets.

## Setup (high level)
1. Clone the repo.
2. Run the setup script (TBD) to download NVIDIA dependencies.
3. Accept NVIDIA terms when prompted.
4. Launch the sim and load the first level.

## Streaming
- Full fidelity sim runs on the GPU and can stream to a browser client.
- Lightweight previews can be hosted directly on the website.

## Open questions
- Final setup script location and naming.
- Supported OS matrix and driver versions.
- Multi-user streaming constraints.

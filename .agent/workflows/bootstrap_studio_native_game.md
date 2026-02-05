---
description: Bootstrap Studio-Native Game
---

WORKFLOW: Bootstrap Studio-Native Game

VERSION: 1.0
OWNER: Studio Architect
STATUS: STABLE

==================================================
INTENT
==================================================

This workflow creates a NEW Studio-Native game by instantiating
the frozen `game-template`.

This workflow is INFRASTRUCTURE ONLY.
No gameplay logic is created here.

==================================================
INPUTS (REQUIRED)
==================================================

- game_id: string (kebab-case, e.g. "cipher-squad")
- game_name: string (human-readable, e.g. "Cipher Squad")

==================================================
PRECONDITIONS
==================================================

- `game-template` repository exists and is frozen.
- Studio Core v1.0 exists and is deployed.
- No GDD parsing has started yet.

==================================================
STEPS (EXECUTE IN ORDER)
==================================================

STEP 1 — Clone Template
- Create a new project by cloning `game-template`.
- Do NOT modify directory structure.
- Do NOT remove any files.

STEP 2 — Set Game Identity
- Replace placeholders ONLY in the following files:
  - studio_contract.json
  - src/config/game_config.js

Required fields:
- game_id = input.game_id
- game_name = input.game_name

STEP 3 — Lock Studio Integration
- Mark /src/studio/** as INFRASTRUCTURE.
- These files MUST NOT be modified by any agent.
- Studio Core integration is considered COMPLETE at this stage.

STEP 4 — Validate Studio Contract
- Ensure studio_contract.json exists.
- Ensure fields:
  - studio_version
  - game_id
  - game_name
  - capabilities
  - required_env
- If invalid → FAIL WORKFLOW.

STEP 5 — Mark Project State
- Mark project as:
  STUDIO_NATIVE = true
- Mark gameplay state as:
  GAMEPLAY_IMPLEMENTED = false

==================================================
FAILURE CONDITIONS (HARD STOP)
==================================================

- Any modification to /src/studio/**
- Missing or invalid studio_contract.json
- Attempt to parse GDD during this workflow
- Attempt to register game in Studio Core
- Attempt to generate API keys

==================================================
OUTPUT
==================================================

- A new Studio-Native game project
- Studio integration present but INACTIVE
- Ready for GDD parsing in gameplay layer ONLY

==================================================
POST-CONDITIONS
==================================================

- GDD parsing may begin ONLY after this workflow completes.
- Studio Core activation occurs later via Admin Panel.

END WORKFLOW

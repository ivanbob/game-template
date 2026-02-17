---
description: Generate a consolidated, non-authoritative overview of core loop assembly, spec coverage, implementation integration, MVP completeness, and risk signals.
---

# WORKFLOW: GAME ARCHITECTURE MAP

**MODE: STRATEGIC REPORTING (READ-ONLY)**

### OBJECTIVE

Generate a consolidated, non-authoritative overview of:

* Core loop assembly
* Spec coverage
* Implementation integration
* MVP completeness
* Risk signals

---

### CRITICAL RULES

1. DO NOT modify `project_state.json`
2. DO NOT modify specs
3. DO NOT change lifecycle
4. DO NOT trigger phase transitions
5. DO NOT interpret design intent
6. DO NOT propose improvements

This workflow is observation only.

---

### PROCEDURE

#### STEP 1 — Load Intent

Use:
`gdd_parser`

Extract:
* Core loop
* MVP feature declarations

If BLOCKED → report and stop.

---

#### STEP 2 — Load All Specs

List all `TDC-SPEC-*` (or equivalent IDs in `specs/`).

For each:
* Status
* Implementation state
* UI logic spec presence 
* Spec Guard status 
* QA status 

---

#### STEP 3 — Integration Check

For each implemented spec:
* Verify entry path exists
* Verify it connects to at least one other system
* If not → mark Orphan

No fixes. Just flag.

---

#### STEP 4 — MVP Coverage Comparison

Compare:
Declared MVP systems
vs
Specs written
vs
Specs implemented
vs
QA passed

Compute ratios only.
No projections.

---

#### STEP 5 — Risk Classification

Rules:

RED if:
* Core loop segment missing
* QA HARD FAIL on loop element
* Orphan system in loop

YELLOW if:
* Partial integration
* UI Logic missing for player-facing system

GREEN if:
* Loop fully assembled
* No orphan systems
* QA PASS on loop

---

#### STEP 6 — Output

1. Generate `GAME_ARCHITECTURE_MAP.md`
2. Sync to Notion dashboard (if enabled)
3. STOP

No additional commentary.

---
name: spec-guard
description: >
  Verifies that implementation strictly conforms to the approved specification,
  including declared UI logic specifications. Use this skill to detect deviations,
  scope creep, unauthorized changes, or UI behavior that violates declared intent.
---

# Spec Guard Skill

## Goal

Ensure that:
- The implementation matches the approved spec
- No unauthorized behavior exists
- No scope creep occurred
- No silent design decisions were introduced
- Player-facing UI behavior conforms to declared UI logic specifications

This skill acts as a **gatekeeper**, not a reviewer.

---

## When to Use This Skill

Use this skill:
- After `builder` completes implementation
- Before QA or release
- When a regression is suspected
- When behavior seems “off”

Do NOT use:
- During design
- During spec writing
- To improve or optimize behavior

---

## Required Inputs

The following MUST be provided:

- Approved Spec (full text)
- Implemented code or runnable build
- Confirmation that no spec changes were approved after implementation
- UI Logic Specification(s) for all player-facing features (if applicable)

If any required input is missing:
→ STOP and report BLOCKED.

---

## Validation Process

### Step 1: Spec Surface Extraction

Extract from the approved spec:
- Declared actions
- Declared states
- Declared rules
- Declared constraints
- Declared exclusions
- Declared player-facing interactions

This forms the **allowed behavior set**.

---

### Step 2: UI Logic Spec Enforcement (MANDATORY)

Determine whether the feature includes **player-facing UI or interaction**.

Player-facing UI is considered present if ANY of the following apply:
- Screens, UI elements, buttons, taps, or inputs are described
- Player-triggered actions or feedback loops exist
- Telegram Mini App UI is referenced

If player-facing UI exists:

1. A corresponding UI logic spec MUST exist.
2. The UI logic spec MUST be validated by executing:

   ```bash
   python .agent/skills/ui-logic-spec/scripts/validate_ui_logic.py <ui_logic_spec_path>
Validation results are authoritative.

If the UI logic spec is:

Missing → BLOCKED

Invalid → HARD FAIL

Valid → proceed

If it is unclear whether UI exists:
→ STOP and report BLOCKED.

Step 3: Implementation Surface Scan
Inspect:

Code paths

UI behavior

System responses

Side effects

Focus on:

What the system actually does

What the player can trigger

What outcomes are possible

Step 4: Diff Analysis
Compare:

Approved Spec Behavior
↔ Declared UI Logic Behavior
↔ Implemented Behavior

Classify findings as:

✅ Match

⚠️ Deviation (minor)

❌ Violation (critical)

Step 5: Violation Classification
For each violation, classify:

Type:

Scope Creep

Silent Assumption

Missing Constraint

Extra Behavior

Incorrect Logic

UI Logic Violation

Severity:

LOW (cosmetic)

MEDIUM (behavioral drift)

HIGH (breaks spec or UI contract)

Step 6: Verdict
Produce exactly ONE verdict:

STATUS: PASS

or

STATUS: SOFT FAIL
Reason:
Required Action:

or

STATUS: HARD FAIL
Reason:
Rollback Required: YES

Output Format (MANDATORY)
SPEC GUARD REPORT

Spec ID:
Implementation Reviewed:
UI Logic Spec(s) Referenced:

Findings:

[List]

Violations:

[Type] - [Severity] - [Description]

Verdict:
PASS / SOFT FAIL / HARD FAIL

Required Action:
None / Fix / Rollback

Rules & Constraints
Do NOT propose improvements

Do NOT suggest features

Do NOT interpret intent

Do NOT allow “almost matches”

Do NOT excuse ambiguity

Do NOT bypass UI logic enforcement

If any required spec or UI logic spec is unclear or incomplete:
→ mark BLOCKED.

Failure Conditions
Immediately HARD FAIL if:

Implementation adds behavior not in spec

Spec constraints are ignored

UI behavior contradicts UI logic spec

Player can trigger undefined interactions

Developer “improved” something without approval

Philosophy
The spec is law.
The UI logic spec is a binding contract.
The code obeys or it is rejected.

This skill does not negotiate.
It enforces.

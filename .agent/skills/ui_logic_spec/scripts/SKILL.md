---
name: ui-logic-spec
description: >
  Defines and validates player-facing UI as a logical system of states,
  interactions, and constraints. Use this skill during SPEC phase for any
  player-visible screen or interaction.
---

# UI Logic Specification Skill

## Goal

Formally describe UI as a **state machine** so that:
- agents reason about player affordances
- UX correctness is auditable
- QA has an explicit reference
- no visual tool becomes a source of truth

---

## When to Use

Use this skill when:
- Introducing a new screen
- Modifying interactions
- Adding player constraints
- Investigating confusion or misclicks

This skill is REQUIRED for:
- Any player-facing feature
- Any interaction that accepts input

---

## Required Output

The skill MUST produce:
- A YAML UI logic spec
- Validated against schema
- Stored in version control

---

## Core Model

Each UI spec MUST define:
- Screen identity
- States
- Interactions
- Constraints
- Failure handling

Visual layout is OUT OF SCOPE.

---

## Validation

Validate specs using:
```bash
python scripts/validate_ui_logic.py <path>
If validation fails:
→ BLOCK and report errors.

Constraints
Do NOT invent mechanics

Do NOT design visuals

Do NOT assume unlimited attention

Telegram Mini App constraints apply

Output Format
UI intent summary

Declared states

Interaction table

Risk flags


---

## ✅ `schema/ui_logic.schema.yaml`

```yaml
type: object
required:
  - screen_id
  - states
  - interactions
  - constraints

properties:
  screen_id:
    type: string

  states:
    type: array
    minItems: 1
    items:
      type: object
      required: [id, description]

  interactions:
    type: array
    items:
      type: object
      required:
        - id
        - trigger
        - from_state
        - to_state

  constraints:
    type: object
    required:
      - max_simultaneous_actions
    properties:
      max_simultaneous_actions:
        type: integer
      disable_on_error:
        type: boolean
      time_pressure:
        type: boolean
---
name: spec-architect
description: >
  Converts a validated GDD analysis or Intent document into a strict,
  implementation-ready technical specification.
  Use this skill when a concept or GDD has been approved and needs to be
  translated into deterministic specs.
---

# Spec Architect Skill

## Goal

Transform structured intent into **explicit, enforceable technical specifications**
that can be safely implemented by an agent or developer.

This skill does NOT:
- design gameplay
- invent mechanics
- make creative decisions
- modify intent

It only formalizes what already exists.

---

## When to Use This Skill

Invoke this skill when:
- A GDD or Intent document already exists
- The concept has been approved
- The project is moving from planning → implementation

Do NOT use this skill:
- To explore ideas
- To brainstorm
- To improve design
- To guess missing details

---

## Input Requirements

The input must include at least one of:
- Output from `gdd_parser`
- An Intent Document
- A confirmed design summary

If any of the following are missing, the skill MUST STOP:
- Core loop
- Player actions
- Win / end condition

---

## Output Format (MANDATORY)

### 1. SPEC METADATA

Spec ID:
Related Feature:
Status: DRAFT
Scope: MVP / FULL


---

### 2. SYSTEM BOUNDARIES

Clearly define:

In Scope:

What this spec includes

Out of Scope:

What this spec explicitly excludes


No ambiguity allowed.

---

### 3. ACTOR DEFINITIONS

Define all actors involved.

Format:
Actor:

Description:

Capabilities:

Limitations:


Example:
Actor: Player

Can place symbol on grid

Cannot undo moves


---

### 4. STATE MODEL

Describe all possible states.

State:

Name:

Description:

Entry Conditions:

Exit Conditions:


States must be exhaustive and mutually exclusive.

---

### 5. ACTION DEFINITIONS

Each action must be deterministic.

Action: <name>
Trigger:
Preconditions:
Process:
Postconditions:
Failure Conditions:


No implicit behavior allowed.

---

### 6. RULES & CONSTRAINTS

List all enforced rules.

Format:
Rule ID:
Description:
Enforcement:
Failure Handling:


If a rule cannot be enforced programmatically → FLAG IT.

---

### 7. SYSTEM RESPONSES

Describe how the system reacts.

Trigger:
System Response:
User-Visible Effect:


Must be deterministic.

---

### 8. EDGE CASES

Explicitly list:
- Invalid input
- Boundary states
- Unexpected sequences

If unknown → mark as TODO.

---

### 9. NON-GOALS

List what this spec explicitly does NOT cover.

This prevents scope creep.

---

### 10. VALIDATION CHECKLIST

Before marking spec as RESOLVED:

- [ ] All states defined
- [ ] No ambiguous language
- [ ] No creative interpretation needed
- [ ] Can be implemented without asking questions
- [ ] Matches original Intent

---

### 11. FINAL OUTPUT

End with exactly one of:

STATUS: READY_FOR_IMPLEMENTATION


or

STATUS: BLOCKED
REASON: <explicit reason>


---

## Constraints

- Do NOT generate code
- Do NOT invent missing rules
- Do NOT redesign mechanics
- Do NOT simplify intent
- Do NOT optimize

If something is unclear → STOP.

---

## Failure Conditions

Immediately stop and return BLOCKED if:
- Core loop is missing
- Win condition is undefined
- Rules contradict each other
- Intent is abstract or poetic
- Multiple interpretations are possible
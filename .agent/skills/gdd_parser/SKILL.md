---
name: gdd-parser
description: >
  Extracts structured intent from a Game Design Document (GDD).
  Produces a normalized, machine-readable summary used for specification.
  Does NOT design, modify, or interpret game ideas.
---

# GDD Parser Skill

## Goal

Transform a raw GDD into a structured **Intent Snapshot** that can be:
- validated
- reviewed by a human
- consumed by spec_architect

This skill **does not design**.
It only extracts what already exists.

---

## When to Use

Use this skill when:
- A GDD is provided
- A concept needs validation
- A project is starting
- You need to determine if specs can be written

Do NOT use:
- To improve design
- To make decisions
- To fix unclear ideas

---

## Input Requirements

The input must contain:
- A full or partial GDD
- Or a clearly labeled concept document

If missing:
→ STOP and report BLOCKED

---

## Output Format (MANDATORY)

### 1. PROJECT SUMMARY
```yaml
title:
platform:
genre:
core_concept:
---
### 2. CORE LOOP (Extracted Only)
Describe ONLY what is explicitly stated.

loop:
  - player_action:
  - system_response:
  - player_feedback:
  - loop_end_condition:
If unclear → mark BLOCKED.
---

### 3. MECHANICS LIST
Each mechanic must be explicitly mentioned in the GDD.

mechanics:
  - name:
    input:
    output:
    constraints:
If mechanics are implied → flag as ambiguity.
---

### 4. RULES & CONSTRAINTS
Extract only hard rules.

rules:
  - rule:
    enforcement:
---
### 5. STATE & FLOW EXTRACTION
states:
  - name:
    entry_condition:
    exit_condition:
---
### 6. FAILURE & EDGE CASES
failure_modes:
  - description:
    handling:
---
### 7. EXPLICIT NON-GOALS
out_of_scope:
  - item
---
### 8. AMBIGUITY REPORT
List anything that:

is implied

is subjective

cannot be implemented deterministically

ambiguities:
  - description:
    reason:
---
### 9. RISK FLAGS
risks:
  design:
  technical:
  ux:
  scope:
Severity: LOW / MEDIUM / HIGH

### 10. FINAL VERDICT (MANDATORY)
Choose exactly one:

verdict: READY_FOR_SPEC
or

verdict: BLOCKED
reason:
--- 
Rules
❌ Do NOT invent mechanics
❌ Do NOT simplify
❌ Do NOT resolve ambiguity
❌ Do NOT propose improvements
❌ Do NOT interpret intent

✅ Extract only what exists
✅ Flag everything unclear
✅ Be literal
✅ Be strict

Failure Conditions
Return BLOCKED if:

Core loop is unclear

Win condition missing

Input depends on “feel”

Rules contradict

Multiple interpretations exist

Philosophy
This skill is a compiler front-end, not a designer.

If something cannot be implemented without asking a human,
the parser must stop.


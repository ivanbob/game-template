---
name: qa-feel-audit
description: >
  Evaluates the qualitative feel and experiential correctness of a built feature
  by comparing player perception against declared UI logic specifications.
---

# QA Feel Audit Skill

## Goal

Evaluate whether the implemented feature:
- feels correct to a player
- matches the declared UI logic specification
- introduces confusion, friction, or emotional mismatch

This skill does NOT:
- modify code
- redesign systems
- propose features
- reinterpret intent

It reports **player truth vs declared intent**.

---

## When to Use This Skill

Use this skill:
- After a build is completed
- Before approving QA
- When validating player-facing behavior

Do NOT use:
- Before implementation
- Without a runnable build
- Without a UI logic spec

---

## Input Requirements (MANDATORY)

The input MUST include:
- Runnable build or deployed state
- Reference UI logic spec (file or excerpt)
- Description of what was implemented

If UI logic spec is missing:
→ STOP and report BLOCKED.

---

## Audit Dimensions

### 1. Clarity vs Spec

Evaluate:
- Are allowed actions obvious?
- Do observed actions match spec-defined interactions?

Output:
Clarity: PASS / WEAK / FAIL  
Spec Deviation: NONE / MINOR / MAJOR  
Notes:

---

### 2. Responsiveness

Evaluate:
- Is feedback timely and noticeable?
- Are state transitions perceptible?

Output:
Responsiveness: PASS / WEAK / FAIL  
Notes:

---

### 3. Friction & Constraint Integrity

Evaluate:
- Are constraints enforced?
- Can players do things they should not?
- Is hesitation induced unintentionally?

Output:
Friction: LOW / MEDIUM / HIGH  
Constraint Integrity: INTACT / LEAKING / BROKEN  
Notes:

---

### 4. Intent Alignment

Compare behavior against:
- UI logic spec
- Declared interaction flow

Output:
Intent Match: YES / PARTIAL / NO  
Notes:

---

### 5. Emotional Signal

Evaluate the *player reaction*.

Possible labels:
- Neutral
- Curious
- Tense
- Confused
- Frustrated
- Engaged

Output:
Dominant Feeling:  
Notes:

---

### 6. Replay Impulse

Evaluate:
- Does the system invite retry?
- Is failure informative or punishing?

Output:
Replay Desire: YES / MAYBE / NO  
Reason:

---

## Output Format (MANDATORY)

QA FEEL AUDIT RESULT

Clarity:
Spec Deviation:
Responsiveness:
Friction:
Constraint Integrity:
Intent Match:
Dominant Feeling:
Replay Desire:

Summary:
<short paragraph>

Verdict:
PASS / SOFT FAIL / HARD FAIL

Recommended Action:
Proceed / Revise / Rollback

---

## Failure Conditions

Return HARD FAIL if:
- UI behavior contradicts logic spec
- Player can perform undefined actions
- Feedback is missing or misleading
- Emotional signal contradicts intent

---

## Philosophy

This skill is the **player’s nervous system**.

It does not reason.
It reacts.

Truth over politeness.

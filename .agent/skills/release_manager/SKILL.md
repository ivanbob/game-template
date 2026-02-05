---
name: release-manager
description: >
  Coordinates and validates the release of a build based on approved specs,
  QA results, and project state. Use this skill to prepare, verify, and finalize
  a release candidate.
---

# Release Manager Skill

## Goal

Ensure that a build is:
- complete
- validated
- compliant with specs
- safe to release

This skill does NOT:
- build features
- fix bugs
- change code
- approve design

It only verifies readiness and orchestrates release steps.

---

## When to Use This Skill

Use this skill when:
- Implementation is complete
- QA has been run
- Spec Guard has passed
- You want to prepare a release or test build

Do NOT use:
- During development
- Before QA
- As a replacement for testing

---

## Required Inputs

The following must be available:

- Latest build or artifact
- Spec ID(s)
- QA Feel Audit result
- Spec Guard result

If any are missing:
→ STOP and report BLOCKED.

---

## Pre-Flight Check (BLOCKING)

Before proceeding with the checklist, you MUST:

1. **Verify Git Status Clean**:
   - Run `git status`
   - If output shows ANY modified, staged, or untracked files → STOP immediately.
   - Report BLOCKED: "Repo is dirty. Commit or stash changes before releasing."

2. **Verify Staging First**:
   - **Crucial**: Production releases are FORBIDDEN if Staging is invalid.
   - Confirm Staging was deployed using `npm run deploy:staging`.
   - Confirm QA was performed on the Staging URL (`165fc490.daily-cipher-dev.pages.dev` or alias).
   - *Note*: KPI Dashboard is **Production Only**. Staging verification applies to the Game App.

---

## Release Checklist (MANDATORY)

### 1. Spec Compliance

Verify:
- All required specs are implemented
- No spec is in BLOCKED state
- No unresolved deviations exist

Result:
Spec Status: PASS / FAIL


---

### 2. QA Status

Verify:
- QA Feel Audit exists
- Verdict is PASS or SOFT FAIL
- No HARD FAIL unresolved

Result:
QA Status: PASS / FAIL


---

### 3. Build Integrity

Verify:
- Build runs
- No runtime crashes
- Entry point loads correctly
- Core loop is accessible

Result:
Build Status: PASS / FAIL


---

### 4. Scope Lock

Verify:
- No features added post-spec
- No untracked changes
- No experimental code

Result:
Scope Status: LOCKED / VIOLATED


---

### 5. Deployment Hygiene (STRICT)

Verify:
- **Git Status Clean**: Run `git status`. If any modified or untracked files exist → STOP.
- **Staging Verification**: Confirm Staging build was deployed via `npm run deploy:staging` and verified.
- **Production Constraint**: Production deploy (`git push origin main`) is FORBIDDEN until Staging is Verified.

Result:
Repo Status: CLEAN / DIRTY
Flow Status: VALID / INVALID


---

### 6. Release Type Determination

Determine release type:

INTERNAL (dev/staging)

PLAYTEST

PUBLIC


Based on:
- QA result
- Stability
- Feature completeness

---

### 7. Finalization & Commit (MANDATORY)

After updating `project_state.json` to RELEASED/DONE:

**YOU MUST IMMEDIATELY COMMIT THE STATE.**

Action:
1. Run `git add .`
2. Run `git commit -am "chore(release): v<VERSION> - <NOTES>"`
3. Run `git push`

Constraint:
- Do NOT leave the repo in a dirty state after a release.
- The project state update AND the release commit must happen in the same session.

---

## Release Output

If all checks pass:

RELEASE STATUS: APPROVED

Release Type:
Build ID:
Included Specs:
Known Limitations:
Next Recommended Action:


If any check fails:

RELEASE STATUS: BLOCKED

Reason:
Required Action:


---

## Constraints

- Do NOT modify code
- Do NOT fix issues
- Do NOT change scope
- Do NOT override QA or Spec Guard
- Do NOT assume readiness

If in doubt → BLOCK.

---

## Failure Conditions

Immediate BLOCK if:
- Spec Guard failed
- QA result is HARD FAIL
- Build is unstable
- Scope drift detected

---

## Philosophy

This skill protects the project from:
- premature releases
- silent regressions
- emotional decisions
- “just ship it” pressure

It exists to say **NO** when needed.

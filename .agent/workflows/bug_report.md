---
description: 
---

---
description: 
---

# WORKFLOW: BUG REPORT

**MODE: OBSERVATION**

**OBJECTIVE**: 
Log a bug or issue without attempting to fix it. This workflow is for capturing state and symptoms only.

**CRITICAL RULES**:
1. **NO ANALYSIS**: Do not hypothesize root causes.
2. **NO DEBUGGING**: Do not run tests or inspect code deep-dive.
3. **NO FIXING**: Do not touch code.

---

## PROCEDURE

1. **Information Gathering**:
   - Ask user for:
     - Symptoms
     - Reproduction Steps
     - Expected vs Actual

2. **Log to Notion**:
   - Use `notion_integration` to create a bug ticket.
   - Status: `Open`
   - Priority: User defined

3. **STOP**:
   - Report "Bug Logged: [Ticket ID]".
   - Terminate workflow.

---

## POST-REPORT: FIX PROPOSAL (AUTOMATION GATE)

After logging the bug, generate a **Fix Proposal**.

### Fix Proposal MUST include:
- Impact: LOW / MEDIUM / HIGH
- Scope: UI / Logic / Infra
- Risk: LOW / MEDIUM / HIGH
- Files likely affected
- Whether fix is eligible for automation

### Eligibility Rules:
- Eligible ONLY if:
  - Risk == LOW
  - Scope != Infra
  - No spec changes required

### If eligible:
Ask the user EXACTLY:

"Authorize automated bug fix and staging deploy?"

Explain that this will:
- Temporarily switch lifecycle to BUILD
- Analyze, fix, commit
- Push to staging
- STOP before production

Do NOT proceed unless user replies with:
AUTHORIZE BUG FIX AUTOMATION

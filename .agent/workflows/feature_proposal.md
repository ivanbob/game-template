---
description: 
---

---
name: feature_proposal
trigger: manual
allowed_skills:
  - gdd_parser
  - view_file
forbidden_skills:
  - builder
  - spec_architect
  - spec_guard
  - run_command
lifecycle_constraints:
  - "Allowed in ANY phase"
---

# WORKFLOW: FEATURE PROPOSAL

**MODE: IDEATION**

**OBJECTIVE**: 
Capture and clarify a new feature idea. Ensure alignment with GDD before Spec or Build.

**CRITICAL RULES**:
1. **NO IMPLEMENTATION**: Do not write code.
2. **NO TECHNICAL DESIGN**: Do not design database schemas or API signatures yet.
3. **NO DECISIONS**: Only the User decides if a feature proceeds.

---

## PROCEDURE

1. **Capture Intent**:
   - Summarize the user's idea.
   - Goals & value proposition.

2. **GDD Alignment Check**:
   - Use `gdd_parser`.
   - Check if feature conflicts with Pillars or Game Philosophy.
   - Flag violations (e.g., "Pay to Win", "Dark Pattern").

3. **Draft Proposal**:
   - Output a summary:
     - Feature Name
     - Summary
     - GDD Alignment: (Pass/Fail)
     - Impacted Systems

4. **Verdict**:
   - User Decision: `PROCEED TO SPEC` or `DISCARD` or `HOLD`.

5. **STOP**:
   - Terminate workflow.

---
name: clickup-integration
description: >
  Synchronizes project state, bugs, and architecture with ClickUp.
  Now acts as a "Project Dashboard" v2.0.
---

# ClickUp Integration Skill (v2.0)

## Goal
Transform ClickUp from a passive mirror into a **Strategic Project Dashboard**.
This skill manages the "List Description" as a Heads-Up Display (HUD) and synchronizes bugs/architecture to specific areas.

## Capabilities

### 1. Dashboard Sync (List Description)
**Trigger**: Phase Change, Spec Completion, or Manual Invocation.
**Action**: Updates the *Main List Description* with a rich markdown summary:
- **Project Phase**: (from `project_state.json`)
- **Version**: (from `project_state.json`)
- **Active Blockers**: (from `project_state.issues`)
- **Recent Wins**: Last 3 completed specs.

### 2. Bug Tracking (Separate List)
**Trigger**: New entries in `project_state.issues` or `# BUGS` section in `task.md`.
**Action**: 
- Scans for active bugs.
- Creates/Updates tasks in the **"Bugs"** List.
- Status mapping: `OPEN` -> `TO DO`, `FIXED` -> `COMPLETE`.

### 3. Architecture Sync (Docs)
**Trigger**: Updates to `specs/TDC-ARCH-*.md`.
**Action**:
- Pushes content of Architecture Specs to ClickUp Docs.
- Ensures the "Game Architecture" view is always 1:1 with code specs.

## Usage Process

1. **Load State**: Read `project_state.json` and `task.md`.
2. **Generate Dashboard**: Construct the dashboard markdown string.
3. **Diff Bugs**: Compare local bugs with known remote bugs (simulated).
4. **Execute Sync**:
   - `PUT /list/{id}` (Update Description)
   - `POST /list/{bug_list_id}/task` (Create Bugs)
   - `POST /doc/{id}` (Update Architecture)

## Rules
- **Authority**: Local files (`project_state.json`, `specs`) are ALWAYS the source of truth. ClickUp is the *view*.
- **No Overwrite**: Do not overwrite manual comments in ClickUp tasks.
- **Visuals**: Use emojis and bold text in the Dashboard for readability.

## Example Dashboard Output

```markdown
# 🚀 Project Dashboard: AI Indie Studio

| Metric | Status |
| :--- | :--- |
| **Phase** | `RELEASE` (v1.3.0) 🟢 |
| **Build** | `SUCCESS` (TDC-BUILD-006) |
| **Last Spec**| `TDC-ARCH-001` (Architecture) |

## 🚧 Active Blockers
- None! All systems nominal.

## 📝 Recent Activity
1. Locked Mode UX Refinement (Completed)
2. Mobile Layout Fixes (Implemented)
3. Architecture Split (Staging/Prod) (Verified)

> *Last Synced: 2026-01-26 12:05*
```
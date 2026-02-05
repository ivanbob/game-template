---
name: notion-integration
description: >
  Synchronizes project state, bugs, and architecture with Notion.
  Acts as the "Project Dashboard" source of truth in Notion.
---

# Notion Integration Skill

## Goal
Maintain a live, bidirectional (where appropriate) sync between `project_state.json` and a specific Notion Page (Dashboard) and Database (Bugs).

## Capabilities

### 1. Dashboard Sync (Page Content)
**Trigger**: Phase Change, Spec Completion, or Manual Invocation.
**Action**: Updates the *Indie Studio Dashboard* page with comprehensive project data.
**Script**: `notion_integration/scripts/sync_dashboard.py`

**Data Sources**:
- `project_state.json` - Phase, Build, QA, Release, Blockers, History
- `TheDailyCipher_GDD.md` - Game title, platform, high-level concept
- `specs/TDC-SPEC-*.md` - All specs with status and feature descriptions
- `specs/TDC-ARCH-001.md` - Staging/Production URLs and branches

**Dashboard Sections**:
1. 🎮 **Game Overview** - Title, platform, and concept from GDD
2. 📊 **Status Overview** - Phase, Build, QA, Active Spec
3. 🌐 **Environments** - Production and Staging URLs with branches
4. 📋 **Specs Completed** - List of all specs with implementation status
5. 🚧 **Active Blockers** - Current blockers from state
6. 📝 **Recent Activity** - Last 3 history entries

### 2. Bug Tracking (Database Sync)
**Trigger**: New entries in `project_state.issues` or `# BUGS` section in `task.md`.
**Action**: Syncs to "Indie Studio Bugs" Database.
**Script**: `notion_integration/scripts/sync_bugs.py`

### 4. Kanban Board Sync (Task Tracking)
**Trigger**: Project Plan changes (`task.md`).
**Action**: Syncs `task.md` to "Indie Studio Tasks" Kanban Board.
**Script**: `notion_integration/scripts/sync_kanban.py`
**Note**: This is the PRIMARY method for tracking granular task progress in Notion.

## Usage Process

1. **Load State**: Read `project_state.json`.
2. **Execute Sync Scripts**:
   - **Kanban (Progress Tracker)**:
     `python .agent/skills/notion_integration/scripts/sync_kanban.py "path/to/task.md"`
   - **Dashboard (High-level Status)**:
     `python .agent/skills/notion_integration/scripts/sync_dashboard.py`

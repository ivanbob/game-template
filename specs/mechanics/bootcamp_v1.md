# SPEC METADATA
Spec ID: MEC-002
Related Feature: Bootcamp (Onboarding)
Status: DRAFT
Scope: MVP

---

# SYSTEM BOUNDARIES
**In Scope:**
- 2x2 Tile Grid (Solo)
- Simplified Tile Claiming (Auto-lock)
- Tile Solving (Numeric/Nonogram)
- State Transition: New User -> Bootcamp -> Lobby

**Out of Scope:**
- Squad interactions
- Leaderboards
- Time limits (Soft-lock strictly for mechanics, not competitive)
- Server-side persistence (Bootcamp can be client-side only for MVP, or minimal server state)

---

# ACTOR DEFINITIONS

**Actor: Recruit (New User)**
- **Description**: A user with no history/stats in the system.
- **Capabilities**:
  - Enter Bootcamp immediately upon auth.
  - Solve 4 static tutorial puzzles.
  - Graduate to "Operative" status.
- **Limitations**:
  - Cannot see Squad Lobby.
  - Cannot access Daily Vault until Bootcamp is complete.

---

# STATE MODEL

**State: BOOTCAMP_ACTIVE**
- **Description**: User is in the tutorial flow.
- **Entry**: `User.isNew` is true OR `User.stats.bootcamp_completed` is false.
- **Exit**: All 4 tiles solved.

**State: BOOTCAMP_COMPLETE**
- **Description**: User has finished training.
- **Entry**: Last tile solved.
- **Exit**: User clicks "Enter Hub" -> Transition to `LOBBY`.
  - Side Effect: Update User Profile (`bootcamp_completed = true`).

---

# ACTION DEFINITIONS

**Action: Start Bootcamp**
- **Trigger**: New user app load.
- **Process**: Load static 2x2 Vault Config (Local JSON).
- **UI**: Show "Training Mode" header.

**Action: Solve Tutorial Tile**
- **Trigger**: User inputs correct solution.
- **Rule**: Solutions are fixed (e.g., "1", "2", "3", "4" or specific patterns).
- **Feedback**: Instant success, tile reveal.

**Action: Graduate**
- **Trigger**: 4/4 Tiles Solved.
- **Process**: 
  - API Call: `completeBootcamp()` (or update user metadata).
  - Redirect: `LoopController` switches state to `LOBBY`.

---

# RULES & CONSTRAINTS

**Rule ID: MANDATORY_ONBOARDING**
- **Description**: New users MUST complete Bootcamp.
- **Enforcement**: `LoopController` checks `user.boocamp_completed` flag before showing `LOBBY`.

**Rule ID: SOLO_INSTANCE**
- **Description**: Bootcamp is a solo instance. No other players can claim tiles.
- **Enforcement**: No server polling for tile locks. Local state only.

**Rule ID: STATIC_CONTENT**
- **Description**: Bootcamp puzzles are hardcoded.
- **Enforcement**: `BootcampVault.jsx` uses a static JSON config, not dynamic D1 fetch.

---

# UI REQUIREMENTS
- **Header**: "CIPHER TRAINING" (Distinct from Daily Vault).
- **Grid**: 2x2 Layout (Larger tiles).
- **Progress**: Simple "X/4 Protocol Complete" counter.
- **Completion**: Modal "YOU ARE READY. JOIN THE SQUAD." -> Button [ENTER VAULT].

---

# SCENARIO: HAPPY PATH
1. User Auth -> System detects `isNew`.
2. `LoopController` sets state `BOOTCAMP`.
3. User sees 2x2 Grid.
4. User taps Tile 1 -> Solves.
5. User taps Tile 2, 3, 4 -> Solves.
6. "Training Complete" Modal appears.
7. User taps "Proceed".
8. System updates DB.
9. `LoopController` sets state `LOBBY`.

---

# FINAL OUTPUT
STATUS: DRAFT

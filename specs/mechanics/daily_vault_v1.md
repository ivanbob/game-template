# SPEC METADATA
Spec ID: MEC-001
Related Feature: Daily Vault (Soft Launch)
Status: READY_FOR_IMPLEMENTATION (RETROACTIVE)
Scope: MVP

---

# SYSTEM BOUNDARIES
**In Scope:**
- 3x3 Tile Grid (Daily)
- Tile Claiming (Locking)
- Tile Solving (Numeric)
- Telegram User Authentication (via WebApp initData)

**Out of Scope:**
- Squad formation (Lobby only)
- Complex puzzles (solutions are 1-9)
- Leaderboards
- User profiles (persistence beyond ID)

---

# ACTOR DEFINITIONS

**Actor: Player**
- **Description**: A user authenticated via Telegram WebApp.
- **Capabilities**:
  - View the daily grid.
  - Claim 1 tile at a time.
  - Submit solution for claimed tile.
  - Release claimed tile.
- **Limitations**:
  - Cannot claim if already holding a lock.
  - Cannot solve if not holding the lock.

---

# STATE MODEL

**State: OPEN**
- **Description**: Tile is available for any player.
- **Entry**: Vault creation or Lock release/expiry.
- **Exit**: Player claims tile.

**State: CLAIMED**
- **Description**: Tile is locked by a specific player.
- **Entry**: Player successfully calls `/claim`.
- **Exit**: 
  - Player solves -> SOLVED
  - Player releases -> OPEN
  - Lock expires (TTL 5 mins) -> OPEN

**State: SOLVED**
- **Description**: Tile is completed. Immutable.
- **Entry**: Player submits correct solution.
- **Exit**: None (Terminal state for the day).

---

# ACTION DEFINITIONS

**Action: Claim Tile**
- **Trigger**: User clicks "Claim" on an OPEN tile.
- **Preconditions**: User has no active locks. Tile is OPEN.
- **Process**: 
  - DB Transaction: Set status='CLAIMED', claimed_by=user_id, expiry=now+5min.
- **Postconditions**: Tile becomes CLAIMED. User HUD shows input form.
- **Failure**: "Tile already taken" or "User already busy".

**Action: Solve Tile**
- **Trigger**: User inputs "1" (or matching index) and submits.
- **Preconditions**: Tile is CLAIMED by User. Input matches solution.
- **Postconditions**: Tile becomes SOLVED.
- **Failure**: "Invalid Solution" (User retains lock).

---

# RULES & CONSTRAINTS

**Rule ID: ONE_LOCK_LIMIT**
- **Description**: A user can only hold one tile lock at a time.
- **Enforcement**: Server checks `getActiveLockForUser(userId)` before allow claim.

**Rule ID: LOCK_TTL**
- **Description**: Locks expire after 5 minutes.
- **Enforcement**: Lazy expiry (checked on read) or explicit release logic. *Current impl: Lazy (frontend shows open if expired, backend allows overwrite).*

**Rule ID: V1_SOLUTION**
- **Description**: For Soft Launch, the solution for Tile N is simply the number N.
- **Enforcement**: Hardcoded validation in `PuzzleEngine`.

---

# FINAL OUTPUT
STATUS: READY_FOR_IMPLEMENTATION

# Progression Mechanics Specification (V1)

## Metadata
- **ID:** `mec_progression_v1`
- **Status:** DRAFT (Implemented as Backend-Only)
- **Scope:** Soft Launch (V1)

## 1. Overview
In V1 (Soft Launch), player progression is **session-based and implicit**. There is no persistent "Level" or "XP" displayed to the user. The primary driver is the daily contribution loop.

## 2. Player Stats (Implicit)
### 2.1 Local Session
- The client MAY track "My Claims" and "My Solves" based on the current Vault data by filtering `tiles` where `claimedBy == myUserId`.
- This data is ephemeral to the current vault day.

### 2.2 Global Stats (Backend)
The system tracks aggregate activity for the Studio Core dashboard.
- **DAU:** Unique users active per day.
- **Completion:** Total tiles claimed/solved per vault.

## 3. Leaderboards (Future/V2)
**NOT IMPLEMENTED IN V1.**
- Future intent: "Squads" competition.
- Current state: No API endpoints exist for fetching leaderboards.

## 4. Rewards
- **Intrinsic:** "Shard Found" message upon solving.
- **Extrinsic:** None in V1 (No coins, badges, or items).

## 5. Persistence
- **User Identity:** Derived from Telegram WebApp Data (`initData`). Authenticated via HMAC.
- **History:** `tiles` table stores `completed_by` and `claimed_by`.
- **Note:** While history *exists* in D1, it is not exposed to the client via an API.

## 6. Constraints & Rules
- **No Pay-to-Win:** Progression is purely based on activity.
- **Reset:** Daily Vault reset clears the "board", resetting the immediate loop.

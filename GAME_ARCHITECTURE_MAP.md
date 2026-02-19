# GAME ARCHITECTURE MAP
**Generated**: 2026-02-19
**Mode**: Observation Only
**Status**: LIVE (Soft Launch)

---

## 1. CORE LOOP ASSEMBLY

| Segment | Status | Component | Spec |
| :--- | :--- | :--- | :--- |
| **Onboarding** | 🟢 **ACTIVE** | `BootcampVault.jsx` | `bootcamp_v1.md` |
| **Daily Access** | 🟢 **ACTIVE** | `CipherGame.jsx` / `LoopController.js` | `core_loop_ui_v1.md` |
| **Collaboration** | 🟡 **PARTIAL** | `VaultGrid.jsx` (Shared State) | `daily_vault_v1.md` |
| **Puzzle Solving** | 🟢 **ACTIVE** | `PuzzleEngine.js` / `TileNodeV2.jsx` | `puzzle_logic_v1.md` |
| **Progression** | 🟢 **ACTIVE** | `Leaderboard.jsx` / `StatsRepository` | `progression_v1.md` (Override) |

**Notes**:
- **Collaboration** is technically active (shared DB), but "Squads" table is missing. Everyone shares the same "Daily Vault" (Global Mercenary Mode).
- **Progression** was `SOLAR-OOS` (Out of Scope), but Basic Leaderboard is now implemented and verified.

---

## 2. SPEC COVERAGE & HEALTH

| Spec ID | Type | Implementation Status | Risk |
| :--- | :--- | :--- | :--- |
| `bootcamp_v1` | Mechanic | ✅ Implemented | Low |
| `daily_vault_v1` | Mechanic | ✅ Implemented | Low |
| `puzzle_logic_v1` | Mechanic | ✅ Implemented | Low |
| `progression_v1` | Mechanic | ⚠️ **Implemented (Unspec'd Upgrade)** | Medium (Feature Creep) |
| `core_loop_ui_v1` | UI | ✅ Implemented | Low |
| `api_v1` | Tech | ✅ Implemented | Low |
| `data_model` | Tech | 🟡 **Divergent** (Missing Squads) | Low (Acceptable for MVP) |

---

## 3. IMPLEMENTATION INTEGRATION

**Entry Points:**
- `src/index.ts` -> `handleTelegramWebhook` (Bot Entry)
- `src/client.jsx` -> `CipherGame` (Web App Entry)

**Data Flow:**
- `CipherGame` -> `LoopController` -> `GameState` -> `TileActions` -> `Worker API` -> `D1 Database`

**Orphan Check:**
- No major orphans detected.
- *Minor*: `squads` table design exists in `data_model.md` but not in DB/Code.

---

## 4. MVP COMPLETENESS

| Feature | Goal | Reality | Verdict |
| :--- | :--- | :--- | :--- |
| **Solo Tutorial** | Must Exist | Exists (`BootcampVault`) | ✅ PASS |
| **Shared Vault** | Must Exist | Exists (Global) | ✅ PASS |
| **Logic Puzzles** | Must Exist | Exists (Nonograms) | ✅ PASS |
| **Visual Reward** | Must Exist | Exists (Pixel Art Reveal) | ✅ PASS |
| **Leaderboard** | Nice to Have | Exists (Daily Top 50) | ✅ BONUS |
| **Squads** | Must Exist | **Global Only** (No Private Squads) | ⚠️ WARN |

**Completeness Ratio**: 90%
(Missing Private Squads is a significant feature cut from the original GDD, effectively making this "Global Cipher Squad" rather than "Group Cipher Squad" for V1).

---

## 5. RISK SIGNALS

### 🟢 GREEN (Stable)
- **Core Gameplay**: Puzzle logic and interactions are robust.
- **Infrastructure**: Cloudflare + D1 + React is performing well.
- **Bootcamp**: "Skip" feature allows devs/users to bypass friction.

### 🟡 YELLOW (Watchlist)
- **Feature Creep**: Leaderboard was added without formal spec update (Validation Gap).
- **Global State**: Currently, ALL users share ONE vault. If DAU spikes >10k, race conditions on `claimTile` might degrade experience.
- **Identity**: "Mercenary Mode" is the *only* mode. Private groups are not supported yet.

### 🔴 RED (Critical)
- *None detected.*

---

## 6. RECOMMENDATIONS (Observation)

1.  **Formalize Leaderboard**: Update `progression_v1.md` to reflect the shipped feature.
2.  **Scalability Test**: Verify `VaultRepository` locking logic under high concurrency (Global Vault limit).
3.  **Squads Roadmap**: Decision needed on when to implement Private Squads (User -> Squad -> Vault) vs Global Grid.

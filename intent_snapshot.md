# Intent Snapshot: Cipher Squad

### 1. PROJECT SUMMARY
```yaml
title: Cipher Squad
platform: Telegram Mini App
genre: Daily Collaborative Logic Puzzle
core_concept: Squads cooperate asynchronously to solve a shared Daily Vault of logic puzzles common to all squads.
```

### 2. CORE LOOP
- **Trigger**: Daily Vault opens at UTC 00:00 (or user opens app).
- **Squad View**: Players see a Mosaic Grid of N independent tiles (e.g., 3x3).
- **Action**: Player claims an available tile -> attempts to solve specific logic puzzle.
- **System**: Enforces soft-lock (5m), validates solution transactionally.
- **Feedback**: Solved tile flips to reveal image part.
- **Progress**: Entire Squad sees progress.
- **Win**: All tiles solved -> Vault Completion Time recorded -> Global Rank assigned.

### 3. MECHANICS LIST
- **Daily Vault**: Shared state for the squad, resets daily.
- **Mosaic Grid**: 3x3 (initially) grid of tiles.
- **Tile Claiming**: Exclusive lock on a tile for a duration.
- **Soft-Lock**: 5-minute timer, refreshes on interaction. Expire -> release.
- **Draft Recovery**: LocalStorage caches unfinished state; restores if reclaimed before others solve.
- **Logic Puzzle**: Deterministic puzzle per tile (e.g., Nonogram) with unique solution.
- **Contribution Friction**: Soft limits on tiles per player (cooldowns/delays) to encourage squad growth.
- **Help Signal**: Button to post "Help me" deep link to Telegram chat.
- **Leaderboard**: Ranked by Vault Completion Time.

### 4. RULES & CONSTRAINTS
- **Async by Default**: No real-time requirement.
- **Puzzle Quality**: 30-70% fill rate, unique solution, deterministically valid.
- **Atomic Completion**: First valid submission wins; others get "Already Solved".
- **Studio Invariant**: Must use `src/studio` for Auth/Analytics/Leaderboards (Infrastructure).
- **No Pay-to-Win**: Monetization (Stars) for friction reduction only (Lock extension, Retry, Hint), not Auto-complete.

### 5. STATE & FLOW EXTRACTION
- **Game States**:
    - `BOOTCAMP`: Solo onboarding flow (2x2 vault).
    - `LOBBY`: Viewing Squad status / Daily Vault countdown.
    - `VAULT_ACTIVE`: Vault open, tiles available.
    - `PUZZLE_ACTIVE`: Player inside a specific tile (Locked).
    - `VAULT_COMPLETE`: All tiles solved, summary view.
- **Data Entities**: Squads, DailyVaults, Tiles, TileLocks, TileCompletions, MemberStats.

### 6. FAILURE & EDGE CASES
- **Race Condition**: Two players submit same tile -> DB Transaction ensures one winner. Loser gets positive UX ("Too slow but nice try").
- **Disconnect**: Draft recovery restores state upon reconnection/reclaim.
- **AFK Player**: Lock expires, tile becomes free for others.

### 7. EXPLICIT NON-GOALS
- Real-time multiplayer (sync).
- PvP attacks.
- User-generated content.
- Blockchain/NFTs.

### 8. AMBIGUITY REPORT
- *None specific*. GDD is highly deterministic regarding V1 scope and mechanics.

### 9. RISK FLAGS
- **Technical**: Cloudflare D1 concurrency for high-volume tile claiming/submission (mitigated by transactional/atomic constraint).
- **UX**: "Soft Contribution Friction" needs careful balancing to avoid frustration vs. anti-carry.

### 10. FINAL VERDICT
verdict: READY_FOR_SPEC

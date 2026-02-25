# Mechanics Spec: Private Squads & Profiles (V2)

## 1. Goal
Move Cipher Squad from a single "Global Vault" to a multi-tenant system where users can form **Private Squads**.
Each Squad has its own isolated Daily Vault, scaled to its member count at generation time.
Users also have persistent **Profiles** to track stats across all squads.

## 2. Core Concepts
### 2.1 The Global Vault (Default)
- **Concept**: The "Lobby" or "Public Square".
- **Access**: Default for all new users.
- **Scale**: "Large" Tier (80x80+).
- **Behavior**: Same as V1. Ideally, this acts as the "Lobby" until a user joins/creates a specific squad.

### 2.2 Private Squads
- **Concept**: Isolated groups of players.
- **Access**: Invite Only (via Link/Code).
- **Behavior**:
  - Own `vault_id` per day.
  - Own `leaderboard`.
  - Chat/Context specific to the Squad.

## 3. Dynamic Scaling (Game Balance)
To ensure consistent pacing (~50-60 tiles/person), Vaults scale based on `squad_members` count at generation time.

| Tier | Member Count | Grid Size | Total Tiles | Tiles/Person |
| :--- | :--- | :--- | :--- | :--- |
| **Solo/Duo** | 1-2 | 12x12 | 144 | 72-144 |
| **Micro** | 3-9 | 20x20 | 400 | ~45-133 |
| **Small** | 10-25 | 35x35 | 1225 | ~50-120 |
| **Medium** | 26-50 | 50x50 | 2500 | ~50-96 |
| **Large** | 50+ | 80x80 | 6400 | <128 |

## 4. User Experience Paths
### 4.1 Join Flow (New User)
1.  User opens Bot -> `/start`.
2.  backend: Checks `squad_members`. If none -> Adds to **Global Squad** (as default).
3.  frontend: Loads **Global Vault**.

### 4.2 Create Squad
1.  User clicks "Lobby" -> "Create Squad".
2.  Enters Name (e.g., "Alpha Team").
3.  backend: Creates `squad` UUID. Adds User as `admin`.
4.  frontend: Switches context to new Squad. Shows "Invite Link".

### 4.3 Join via Invite
1.  User clicks `t.me/bot?start=join_<squad_uuid>`.
2.  backend:
    - Validates UUID.
    - Adds User to `squad_members`.
    - Returns `squad_id`.
3.  frontend: Auto-switches to that Squad's Vault.

## 5. Data Model (Abstract)
- **Squads**: `id`, `name`, `telegram_group_id`.
- **Members**: `squad_id`, `user_id`, `role`.
- **Vaults**: `squad_id`, `date`, `grid_size`, `status`.
- **Stats**: `user_id`, `total_solves`.

## 6. UI Components
- **Squad Header**: "Current: [Name] (Switch)".
- **Lobby**: List My Squads, Create, Join.
- **Leaderboard**: Tabs for [SQUAD] / [GLOBAL].

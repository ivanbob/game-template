# SPEC METADATA
Spec ID: TEC-001
Related Feature: D1 Persistence
Status: READY_FOR_IMPLEMENTATION (RETROACTIVE)

---

# DATA MODEL

## Table: vaults
Tracks the daily game instance.

| Column | Type | Constraints | Description |
|---|---|---|---|
| active_date | TEXT | PRIMARY KEY | YYYY-MM-DD |
| status | TEXT | | 'OPEN', 'COMPLETED' |
| created_at | INTEGER | | Unix Timestamp |

## Table: tiles
Tracks the state of individual puzzle nodes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | e.g. 't1', 't2' |
| vault_id | TEXT | FOREIGN KEY | References vaults.active_date |
| status | TEXT | | 'OPEN', 'CLAIMED', 'SOLVED' |
| claimed_by | TEXT | | Telegram User ID (NULL if Open) |
| lock_expiry | INTEGER | | Unix Timestamp (NULL if Open) |
| completed_by| TEXT | | Telegram User ID (NULL if Unsolved) |
| completed_at| INTEGER | | Unix Timestamp |
| data | TEXT | JSON | Clue content (e.g. `{"clue": "Alpha"}`) |
| solution | TEXT | JSON | Validation data (e.g. `{"val": 1}`) |

---

# MIGRATION STRATEGY
- **Soft Launch**: `schema.sql` applied manually via `wrangler d1 execute`.
- **Seeding**: `seed.sql` used for initial population. Future seeding via `[Scheduled]` worker event.

---

# FINAL OUTPUT
STATUS: READY_FOR_IMPLEMENTATION

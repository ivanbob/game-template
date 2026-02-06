-- Cipher Squad D1 Schema (Corrected)

DROP TABLE IF EXISTS tiles;
DROP TABLE IF EXISTS vaults;

-- Daily Vaults
CREATE TABLE vaults (
    day_id TEXT PRIMARY KEY,           -- e.g. "2024-01-01"
    status TEXT DEFAULT 'ACTIVE',       -- ACTIVE, COMPLETE
    created_at INTEGER DEFAULT (unixepoch())
);

-- Tiles (Composite Primary Key)
CREATE TABLE tiles (
    vault_id TEXT NOT NULL,
    id TEXT NOT NULL,                  -- e.g. "t1"
    status TEXT DEFAULT 'OPEN',         -- OPEN, CLAIMED, SOLVED
    claimed_by TEXT,
    lock_expiry INTEGER,               -- unix seconds
    completed_by TEXT,
    completed_at INTEGER,              -- unix seconds
    data JSON,
    solution JSON,
    PRIMARY KEY (vault_id, id),
    FOREIGN KEY (vault_id) REFERENCES vaults(day_id)
);

-- Indexes
CREATE INDEX idx_tiles_vault ON tiles(vault_id);
CREATE INDEX idx_tiles_status ON tiles(status);

-- Enforce "one active lock per user per vault"
CREATE INDEX idx_tiles_claimed_by
ON tiles(vault_id, claimed_by)
WHERE status = 'CLAIMED';

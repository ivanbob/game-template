CREATE TABLE IF NOT EXISTS vaults (
    active_date TEXT PRIMARY KEY,
    status TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS tiles (
    id TEXT PRIMARY KEY,
    vault_id TEXT,
    status TEXT,
    claimed_by TEXT,
    lock_expiry INTEGER,
    completed_by TEXT,
    completed_at INTEGER,
    data TEXT,
    solution TEXT
);

-- Link Squads to Telegram Groups
CREATE TABLE IF NOT EXISTS squads (
    id TEXT PRIMARY KEY,          -- UUID
    telegram_group_id TEXT UNIQUE, -- Telegram Group ID (from ctx)
    name TEXT,
    invite_link TEXT,
    created_at INTEGER,
    created_by TEXT               -- User ID
);

-- Squad Membership for Profiles & Access Control
CREATE TABLE IF NOT EXISTS squad_members (
    squad_id TEXT,
    user_id TEXT,
    role TEXT DEFAULT 'member',   -- 'admin', 'member'
    joined_at INTEGER,
    PRIMARY KEY (squad_id, user_id),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Multi-tenant Vaults
-- Old PK was active_date. New PK must be (squad_id, active_date) OR a surrogate UUID.
-- Recommendation: Surrogate UUID to keep foreign keys simple.
CREATE TABLE IF NOT EXISTS vaults_v2 (
    id TEXT PRIMARY KEY,          -- UUID
    squad_id TEXT,
    active_date TEXT,             -- YYYY-MM-DD
    grid_size INTEGER DEFAULT 50, -- N x N (e.g. 20, 40, 80)
    status TEXT,                  -- 'OPEN', 'COMPLETED'
    created_at INTEGER,
    completed_at INTEGER,
    UNIQUE(squad_id, active_date),
    FOREIGN KEY (squad_id) REFERENCES squads(id)
);

-- Tiles linked to Vault UUID
CREATE TABLE IF NOT EXISTS tiles_v2 (
    id TEXT PRIMARY KEY,          -- UUID or x_y_vaultid
    vault_id TEXT,                -- FK to vaults_v2.id
    x INTEGER,
    y INTEGER,
    status TEXT,                  -- 'HIDDEN', 'OPEN', 'LOCKED', 'SOLVED'
    claimed_by TEXT,              -- User ID
    lock_expiry INTEGER,
    completed_by TEXT,            -- User ID
    completed_at INTEGER,
    data TEXT,                    -- JSON content
    solution TEXT,                -- Encrypted? or Plaintext index
    FOREIGN KEY (vault_id) REFERENCES vaults_v2(id)
);

-- User Profiles (Global Stats)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    total_solves INTEGER DEFAULT 0,
    vaults_completed INTEGER DEFAULT 0,
    last_active INTEGER
);

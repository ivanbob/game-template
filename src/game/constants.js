/**
 * @file constants.js
 * @description Core constants for Cipher Squad gameplay mechanics.
 * Defines state enums, tile statuses, and configuration limits.
 */

// Global Game State Machine
export const GAME_STATES = {
    BOOT: 'BOOT',                   // App Init
    LOBBY: 'LOBBY',                 // Waiting / Post-Game
    VAULT_ACTIVE: 'VAULT_ACTIVE',   // Main Grid View
    TILE_FOCUSED: 'TILE_FOCUSED',   // Modal/Details View
    PUZZLE_ACTIVE: 'PUZZLE_ACTIVE', // Active Solving (Server State)
    ACTION_SUBMITTING: 'ACTION_SUBMITTING', // Async Transaction
    ERROR_FEEDBACK: 'ERROR_FEEDBACK' // Transient Error
};

// Status of an individual Mosaic Tile
export const TILE_STATUS = {
    LOCKED: 'LOCKED',   // Not yet available (future use or pre-reqs)
    OPEN: 'OPEN',       // Available to claim
    CLAIMED: 'CLAIMED', // Currently locked by a squad member
    SOLVED: 'SOLVED'    // Successfully completed
};

// Configuration constraints (V1)
export const VAULT_CONFIG = {
    GRID_SIZE: 3,           // 3x3 Grid
    LOCK_DURATION_MS: 300000, // 5 minutes
    CONTRIBUTION_LIMIT: 3,  // Soft limit tiles per player before friction
    REFRESH_RATE_MS: 5000   // Polling rate for vault state
};

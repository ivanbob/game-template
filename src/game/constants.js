/**
 * @file constants.js
 * @description Core constants for Cipher Squad gameplay mechanics.
 * Defines state enums, tile statuses, and configuration limits.
 */

// Global Game State Machine
export const GAME_STATES = {
    BOOTCAMP: 'BOOTCAMP', // New User Onboarding
    BOOTCAMP_COMPLETE: 'BOOTCAMP_COMPLETE', // Graduation
    LOBBY: 'LOBBY',
    VAULT_ACTIVE: 'VAULT_ACTIVE',
    PUZZLE_ACTIVE: 'PUZZLE_ACTIVE',
    VAULT_COMPLETE: 'VAULT_COMPLETE',
    ERROR_FEEDBACK: 'ERROR_FEEDBACK',
    TILE_FOCUSED: 'TILE_FOCUSED',
    ACTION_SUBMITTING: 'ACTION_SUBMITTING'
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

/**
 * @file TileActions.js
 * @description Encapsulates all user intents related to Tile interaction.
 * Bridges the UI components to the GameState and Backend API.
 * NOTE: Contains intent-level operations; authoritative validation happens server-side.
 */

import { gameState } from '../state/GameState';
import { TILE_STATUS, GAME_STATES } from '../constants';

import { puzzleEngine } from '../logic/PuzzleEngine';

// CONFIG: Feature Flag for V1 Integration
// CONFIG: Feature Flag for V1 Integration
const USE_REMOTE_API = true;
// Hardcoded Worker URL for Soft Launch
export const API_BASE = 'https://cipher-squad-worker.jikoentcompany.workers.dev/api/game/vault';

function response(success, error = null, data = null) {
    return { success, error, data };
}

/**
 * Helper to call Backend
 */
async function callApi(endpoint, method, body) {
    if (!USE_REMOTE_API) return { success: true };

    // Safe Telegram Auth Extraction
    let authHeader = '';
    const telegram = window.Telegram?.WebApp;

    if (telegram?.initData) {
        authHeader = `tma ${telegram.initData}`;
    } else {
        console.warn('[TileActions] Telegram WebApp not detected. Using Dev Mock Auth.');
        // Fallback for Browser Testing
        authHeader = `mock dev_user_local`;
    }

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[TileActions] API Error ${res.status}:`, text);
            return { success: false, error: `API_ERROR_${res.status}: ${text}` };
        }
        const validRes = await res.json();
        console.log(`[TileActions] API Success ${endpoint}:`, validRes);
        return { success: true, data: validRes };
    } catch (e) {
        console.error("API Call Failed", e);
        return { success: false, error: "NETWORK_ERROR" };
    }
}

/**
 * Attempts to claim (lock) a specific tile for the user.
 * @param {string} tileId 
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function claimTile(tileId) {
    const user = gameState.currentUser;
    if (!user) return response(false, "USER_NOT_INITIALIZED");

    gameState.startSubmit();

    const vault = gameState.vault;
    const tile = vault.getTile(tileId);

    if (!tile) {
        gameState.endSubmit(false);
        return response(false, "TILE_NOT_FOUND");
    }
    if (tile.status !== TILE_STATUS.OPEN) {
        gameState.endSubmit(false);
        return response(false, "TILE_NOT_OPEN");
    }

    // Optimistic Update
    // Note: We update BEFORE api call, revert if fail.
    vault.updateTile(tileId, {
        status: TILE_STATUS.CLAIMED,
        claimedBy: user.id,
        lockExpiry: Date.now() + 300000 // 5 mins
    });

    // BOOTCAMP OVERRIDE: Local Only
    if (gameState.isBootcampMode) {
        console.log('[TileActions] Bootcamp Claim: Local Success');
        gameState.endSubmit(true);
        return response(true);
    }

    // Server Call
    const apiRes = await callApi('/claim', 'POST', { tileId });
    if (!apiRes.success) {
        // Rollback
        vault.updateTile(tileId, { status: TILE_STATUS.OPEN, claimedBy: null, lockExpiry: null });
        gameState.endSubmit(false);
        return response(false, apiRes.error);
    }

    gameState.endSubmit(true);
    return response(true);
}

/**
 * Releases a lock simply.
 * @param {string} tileId 
 */
export async function releaseTile(tileId) {
    console.log(`[TileActions] Releasing lock on ${tileId}`);

    // Optimistic Update
    gameState.vault.updateTile(tileId, {
        status: TILE_STATUS.OPEN,
        claimedBy: null,
        lockExpiry: null
    });

    // BOOTCAMP OVERRIDE: Local Only
    if (gameState.isBootcampMode) {
        return response(true);
    }

    // Server Call
    // Fire and forget for release (low risk) or await if strict
    await callApi('/release', 'POST', { tileId });

    return response(true);
}

/**
 * Submits a completed solution.
 * Precondition: Must be CLAIMED by user.
 * Validation: Must match PuzzleEngine.validateSolution.
 * Effects: Tile -> SOLVED
 * 
 * @param {string} tileId 
 * @param {Object} solutionPayload 
 * @returns {Promise<Object>}
 */
export async function solveTile(tileId, solutionPayload) {
    const user = gameState.currentUser;
    if (!user) return response(false, "USER_NOT_INITIALIZED");

    gameState.startSubmit();

    const vault = gameState.vault;
    const tile = vault.getTile(tileId);

    if (!tile) {
        gameState.endSubmit(false);
        return response(false, "TILE_NOT_FOUND");
    }

    // Validate ownership
    if (tile.status !== TILE_STATUS.CLAIMED || tile.claimedBy !== user.id) {
        gameState.endSubmit(false);
        return response(false, "INVALID_CLAIM_OR_OWNER");
    }

    // Validate Puzzle Logic
    const validation = puzzleEngine.validateSolution(tile, solutionPayload);
    if (!validation.valid) {
        console.warn(`[TileActions] Invalid solution for ${tileId}:`, validation.error);
        gameState.endSubmit(false);
        return response(false, "INVALID_SOLUTION", { reason: validation.error });
    }

    // Optimistic Update
    vault.updateTile(tileId, {
        status: TILE_STATUS.SOLVED,
        claimedBy: null,
        lockExpiry: null,
        completedBy: user.id,
        completedAt: Date.now()
    });

    // BOOTCAMP OVERRIDE: Local Only
    if (gameState.isBootcampMode) {
        console.log('[TileActions] Bootcamp Solve: Local Success');
        gameState.endSubmit(true);
        return response(true, null, { reward: 'BOOTCAMP_PROGRESSED' });
    }

    // Server Call
    // Payload is now { tileId, solution: [[...], ...] }
    const apiRes = await callApi('/solve', 'POST', { tileId, solution: solutionPayload });
    if (!apiRes.success) {
        // Rollback (Revert to Claimed)
        vault.updateTile(tileId, {
            status: TILE_STATUS.CLAIMED,
            claimedBy: user.id,
            lockExpiry: Date.now() + 300000
        });
        gameState.endSubmit(false);
        return response(false, apiRes.error);
    }

    gameState.endSubmit(true);
    return response(true, null, { reward: 'SHARD_FOUND' });
}

/**
 * Fetches the current vault state.
 */
export async function fetchVault() {
    console.log('[TileActions] Fetching Vault...');
    // endpoint is empty because API_BASE is /api/game/vault
    // Add cache-bust to force fresh read
    const res = await callApi(`?t=${Date.now()}`, 'GET');
    if (res.success && res.data) {

        // POLYFILL: If Main Game tiles are missing solutionGrid (e.g. old vault data),
        // inject the Space Invader pattern locally so Nonograms work.
        if (res.data.grid && res.data.grid.length > 0) {
            const needsPolyfill = res.data.grid.some(t => !t.data?.solutionGrid && !t.id.startsWith('b_'));

            if (needsPolyfill) {
                console.log('[TileActions] Detected missing solutionGrid. Polyfilling locally...');

                // 1. Generate Master Image (15x15) - deterministic "Space Invader"
                const masterImage = Array(15).fill(0).map(() => Array(15).fill(0));
                for (let r = 0; r < 15; r++) {
                    for (let c = 0; c < 15; c++) {
                        if (r === 0 || r === 14 || c === 0 || c === 14) masterImage[r][c] = 1; // Border
                        if (r === c || r === 14 - c) masterImage[r][c] = 1; // X
                        if (r >= 5 && r <= 9 && c >= 5 && c <= 9) masterImage[r][c] = 1; // Center Box
                    }
                }

                // 2. Inject into tiles
                res.data.grid.forEach(t => {
                    if (t.id.startsWith('b_')) return; // Skip Bootcamp

                    // Parse Index from ID (YYYY-MM-DD_t1)
                    const parts = t.id.split('_t');
                    const idx = parseInt(parts[1]) - 1; // 0-8
                    if (isNaN(idx)) return;

                    const rowChunk = Math.floor(idx / 3);
                    const colChunk = idx % 3;

                    // Extract 5x5 Slice
                    const slice = Array(5).fill(0).map((_, r) =>
                        Array(5).fill(0).map((_, c) =>
                            masterImage[rowChunk * 5 + r][colChunk * 5 + c]
                        )
                    );

                    if (!t.data) t.data = {};
                    if (!t.data.solutionGrid) {
                        t.data.solutionGrid = slice;
                        t.data.clue = `Sector ${rowChunk},${colChunk}`;
                    }
                });
            }
        }

        // Sync to GameState
        gameState.syncVault(res.data);
    }
    return res;
}

/**
 * Fetches the Leaderboard (Top 50)
 * @returns {Promise<Array>}
 */
export async function fetchLeaderboard() {
    // API_BASE already includes /api/game/vault
    // we need /api/game/vault/leaderboard
    const res = await callApi('/leaderboard', 'GET');
    if (res.success && Array.isArray(res.data)) {
        return res.data;
    }
    console.warn('[TileActions] Leaderboard return was not an array:', res.data);
    return [];
}

/**
 * @file TileActions.js
 * @description Encapsulates all user intents related to Tile interaction.
 * Bridges the UI components to the GameState and Backend API.
 * NOTE: Contains intent-level operations; authoritative validation happens server-side.
 */

import { gameState } from '../state/GameState';
import { TILE_STATUS } from '../constants';

import { puzzleEngine } from '../logic/PuzzleEngine';

// CONFIG: Feature Flag for V1 Integration
// CONFIG: Feature Flag for V1 Integration
const USE_REMOTE_API = true;
// Hardcoded Worker URL for Soft Launch
const API_BASE = 'https://cipher-squad-worker.jikoentcompany.workers.dev/api/game/vault';

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
        // Sync to GameState
        gameState.syncVault(res.data);
    }
    return res;
}

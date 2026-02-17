/**
 * @file GameState.js
 * @description Singleton state manager for the client-side gameplay loop (AppStateManager).
 * Handles transitions between global game modes and stores transient vault data.
 * NOTE: This is client-side state only. Backend is the source of truth for vault data.
 */

import { GAME_STATES, TILE_STATUS } from '../constants';
import { BOOTCAMP_CONFIG } from '../config/bootcampConfig';

/**
 * In-memory store for the current Mosaic Grid status.
 * Handles read/write operations for tile data.
 */
class VaultStore {
    constructor() {
        this.tiles = new Map(); // id -> Tile
    }

    /**
     * Loads raw vault data into the store.
     * @param {Object} vaultData 
     */
    load(vaultData) {
        if (!vaultData || !vaultData.grid) return;
        this.tiles.clear();
        vaultData.grid.forEach(tile => {
            this.tiles.set(tile.id, { ...tile });
        });
    }

    getTile(tileId) {
        return this.tiles.get(tileId);
    }

    /**
     * Returns an iterator of all tiles.
     * @returns {IterableIterator<Object>}
     */
    getTiles() {
        return this.tiles.values();
    }

    /**
     * Updates a tile's properties.
     * @param {string} tileId 
     * @param {Object} updates 
     * @returns {Object} Updated tile
     */
    updateTile(tileId, updates) {
        const tile = this.tiles.get(tileId);
        if (!tile) return null;
        Object.assign(tile, updates);
        return tile;
    }

    /**
     * Finds any active lock held by a specific user.
     * @param {string} userId 
     * @returns {Object|null} Tile or null
     */
    findActiveLockForUser(userId) {
        for (const tile of this.tiles.values()) {
            if (tile.status === TILE_STATUS.CLAIMED && tile.claimedBy === userId) {
                return tile;
            }
        }
        return null;
    }

    /**
     * Checks for and releases expired locks.
     * @param {number} now - Current timestamp
     * @returns {Array<string>} IDs of released tiles
     */
    checkExpiredLocks(now) {
        const releasedIds = [];
        for (const tile of this.tiles.values()) {
            if (tile.status === TILE_STATUS.CLAIMED && tile.lockExpiry && tile.lockExpiry < now) {
                // Auto-release
                tile.status = TILE_STATUS.OPEN;
                tile.claimedBy = null;
                tile.lockExpiry = null;
                releasedIds.push(tile.id);
            }
        }
        return releasedIds;
    }
}

class GameStateManager {
    constructor() {
        this.currentState = GAME_STATES.LOBBY;
        this.vault = new VaultStore();
        this.currentUser = null;

        // UI Spec State Extensions
        this.selectedTileId = null;
        this.isSubmitting = false;
        this.lastError = null;
        this.isBootcampMode = false;
    }

    /**
     * Initializes the state with user identity.
     * @param {Object} userContext - Identity from Studio Core
     */
    init(userContext) {
        if (!userContext || !userContext.id) {
            console.error('[GameState] Invalid user context');
            return;
        }
        this.currentUser = userContext;
        this.isBootcampMode = false; // Reset by default
        console.log('[GameState] Initialized with user:', userContext.id);
    }

    /**
     * Updates the local store with fresh vault data from server.
     * @param {Object} vaultData - JSON payload from BFF
     */
    syncVault(vaultData) {
        // BOOTCAMP SAFETY: Ignore server updates if we are in Bootcamp
        if (this.isBootcampMode) {
            console.log('[GameState] Ignoring server sync (Bootcamp Mode Active)');
            return;
        }

        this.vault.load(vaultData);

        // Auto-transition logic check
        // If we have active data and are in LOBBY, move to ACTIVE
        if (this.vault.tiles.size > 0 && this.currentState === GAME_STATES.LOBBY) {
            this.transitionTo(GAME_STATES.VAULT_ACTIVE);
        }
    }

    /**
     * Strict transition handler.
     * @param {string} newState - One of GAME_STATES
     */
    transitionTo(newState) {
        console.log(`[GameState] Transition: ${this.currentState} -> ${newState}`);
        this.currentState = newState;
        // TODO: Emit event to UI listeners
    }

    getCurrentState() {
        return this.currentState;
    }

    /**
     * Initializes Bootcamp Mode.
     * Loads static config and sets state.
     */
    initBootcamp() {
        console.log('[GameState] Initializing Bootcamp Mode');
        this.isBootcampMode = true;
        this.vault.load(BOOTCAMP_CONFIG);
        this.transitionTo(GAME_STATES.BOOTCAMP);
    }

    // --- UI Spec Actions ---

    selectTile(tileId) {
        // Allow re-selection or switching while focused (Pivot)
        if (this.currentState !== GAME_STATES.VAULT_ACTIVE &&
            this.currentState !== GAME_STATES.TILE_FOCUSED &&
            this.currentState !== GAME_STATES.PUZZLE_ACTIVE &&
            this.currentState !== GAME_STATES.BOOTCAMP) {
            console.warn(`[GameState] Cannot select tile in state ${this.currentState}`);
            return;
        }
        this.selectedTileId = tileId;
        this.transitionTo(GAME_STATES.TILE_FOCUSED);
    }

    clearSelection() {
        this.selectedTileId = null;
        // Return to appropriate parent state
        this.transitionTo(this.isBootcampMode ? GAME_STATES.BOOTCAMP : GAME_STATES.VAULT_ACTIVE);
    }

    startSubmit() {
        this.isSubmitting = true;
        this.transitionTo(GAME_STATES.ACTION_SUBMITTING);
    }

    endSubmit(success) {
        this.isSubmitting = false;
        // Always return to focused state to show result or allow retry
        this.transitionTo(GAME_STATES.TILE_FOCUSED);
    }

    setError(msg) {
        this.lastError = msg;
        const previousState = this.currentState;
        this.transitionTo(GAME_STATES.ERROR_FEEDBACK);

        // Transient state - auto revert after timeout? 
        // For now, UI should handle the display and call clearError() or similar
        // Or we just stay in ERROR_FEEDBACK until user acknowledges?
        // Spec says: ERROR_FEEDBACK -> VAULT_ACTIVE
        setTimeout(() => {
            this.lastError = null;
            this.transitionTo(GAME_STATES.VAULT_ACTIVE);
        }, 3000);
    }

    /**
     * Checks if a user already has a claimed tile in the vault.
     * @param {string} userId 
     * @returns {boolean}
     */
    userHasActiveLock(userId) {
        // Query VaultStore explicitly
        return !!this.vault.findActiveLockForUser(userId);
    }
}

// Export Singleton
export const gameState = new GameStateManager();

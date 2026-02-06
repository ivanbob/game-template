/**
 * @file LoopController.js
 * @description Main entry point for the gameplay loop. 
 * Orchestrates the "Heartbeat" of the game: State Sync -> Timer Checks -> UI Updates.
 */

import { gameState } from '../state/GameState';
import { VAULT_CONFIG, GAME_STATES, TILE_STATUS } from '../constants';

class LoopController {
    /**
     * Bootstraps the gameplay system.
     * Call this after Studio Core auth is ready.
     * Determines initial state based on local/fetched data.
     * @param {Object} userContext 
     */
    initGame(userContext) {
        console.log('[LoopController] Initializing Game...');
        gameState.init(userContext);

        // Determine initial state
        // Default to LOBBY
        let initialState = GAME_STATES.LOBBY;

        // If vault has data, we might be active
        if (gameState.vault.tiles.size > 0) {
            initialState = GAME_STATES.VAULT_ACTIVE;
        }

        // TODO: Check if user is in Bootcamp (tutorial) via userContext or stats
        // if (userContext.isNew) initialState = GAME_STATES.BOOTCAMP;

        gameState.transitionTo(initialState);
        console.log(`[LoopController] Game initialized in state: ${initialState}`);
    }

    /**
     * Main Game Loop Logic (Heartbeat).
     * Orchestrates state transitions and periodic checks.
     * MUST be called by an external ticker (e.g. RequestAnimationFrame or setInterval).
     * 
     * @param {number} now - Current timestamp (passed in for deterministic testing)
     */
    updateLoop(now) {
        if (!gameState.currentUser) return;

        // 1. Check for expired locks
        // VaultStore mutates state internally if expired
        const releasedIds = gameState.vault.checkExpiredLocks(now);
        if (releasedIds.length > 0) {
            console.log(`[LoopController] Expired locks released: ${releasedIds.join(', ')}`);
        }

        // 2. Evaluate Global State Transitions
        const currentState = gameState.getCurrentState();

        // LOBBY -> VAULT_ACTIVE
        // (Driven by data availability, usually handled in syncVault, but checked here too)
        if (currentState === GAME_STATES.LOBBY) {
            if (gameState.vault.tiles.size > 0) {
                gameState.transitionTo(GAME_STATES.VAULT_ACTIVE);
            }
        }

        // VAULT_ACTIVE -> VAULT_COMPLETE
        if (currentState === GAME_STATES.VAULT_ACTIVE || currentState === GAME_STATES.PUZZLE_ACTIVE) {
            const allSolved = Array.from(gameState.vault.tiles.values()).every(t => t.status === TILE_STATUS.SOLVED);
            if (allSolved && gameState.vault.tiles.size > 0) {
                gameState.transitionTo(GAME_STATES.VAULT_COMPLETE);
                return; // Stop processing other transitions
            }
        }

        // 3. Evaluate Player Sub-State (PUZZLE_ACTIVE <-> VAULT_ACTIVE)
        // Only if we are in an active game mode
        if (currentState === GAME_STATES.VAULT_ACTIVE || currentState === GAME_STATES.PUZZLE_ACTIVE) {
            const userLock = gameState.vault.findActiveLockForUser(gameState.currentUser.id);

            if (userLock && currentState !== GAME_STATES.PUZZLE_ACTIVE) {
                // User has a lock but isn't in PUZZLE_ACTIVE -> Transition
                gameState.transitionTo(GAME_STATES.PUZZLE_ACTIVE);
            } else if (!userLock && currentState === GAME_STATES.PUZZLE_ACTIVE) {
                // User lost lock (expired/released) -> Return to VAULT_ACTIVE
                gameState.transitionTo(GAME_STATES.VAULT_ACTIVE);
            }
        }
    }
}

export const loopController = new LoopController();

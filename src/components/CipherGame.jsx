import React, { useEffect, useState } from 'react';
import { gameState } from '../game/state/GameState';
import { loopController } from '../game/core/LoopController';
import VaultGrid from './VaultGrid';
import GameControls from './GameControls';
import { fetchVault } from '../game/actions/TileActions';

import TileDetailsModal from './TileDetailsModal';
import '../styles/cipher.css';

/**
 * Main Game Container
 * Responsibilities:
 * - Initialize Game Logic
 * - Run Game Loop (Heartbeat)
 * - Subscribe to State Changes (via React State)
 */
const CipherGame = () => {
    const [currentState, setCurrentState] = useState(gameState.getCurrentState());
    const [lastTick, setLastTick] = useState(Date.now());
    const [feedback, setFeedback] = useState('');
    const [selectedTile, setSelectedTile] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // 1. Initialize Game on Mount
    useEffect(() => {
        // REAL IDENTITY SYNC
        // Use stable 'dev_user_local' to match TileActions mock auth
        let userCtx = { id: 'dev_user_local' };

        // Try Telegram Metadata
        const tg = window.Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
            userCtx = {
                id: String(tg.initDataUnsafe.user.id),
                username: tg.initDataUnsafe.user.username
            };
            console.log('[CipherGame] Authenticated as Telegram User:', userCtx.id);
        } else {
            console.warn('[CipherGame] No Telegram Context. Using Mock:', userCtx.id);
        }

        loopController.initGame(userCtx);

        // Fetch Data
        fetchVault().then((res) => {
            console.log('[CipherGame] Initial Vault Scan Complete', res);
            if (!res || !res.success) {
                setFeedback('FAILED TO LOAD VAULT DATA');
            }
        }).catch(err => {
            console.error('[CipherGame] Vault Fetch Failed:', err);
            setFeedback('CONNECTION ERROR: RETRYING...');
        });

        // Force initial render
        setCurrentState(gameState.getCurrentState());
    }, []);

    // 2. Game Loop Effect
    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = Date.now();
            loopController.updateLoop(now);
            setCurrentState(gameState.getCurrentState());

            // Sync Selection
            const selId = gameState.selectedTileId;

            // Auto-Select Logic (Unless Minimized)
            if (currentState === 'PUZZLE_ACTIVE' && !selId && !isMinimized) {
                const ownerId = gameState.currentUser?.id;
                const lockedTile = gameState.vault.findActiveLockForUser(ownerId);
                if (lockedTile) {
                    // Auto-select
                    gameState.selectTile(lockedTile.id);
                }
            }

            if (selId) {
                const tile = gameState.vault.getTile(selId);
                setSelectedTile(tile ? { ...tile } : null);
                // If we have a selection, we are not minimized
                if (selId && isMinimized) setIsMinimized(false);
            } else {
                setSelectedTile(null);
            }

            setLastTick(now);
        }, 100);

        return () => clearInterval(intervalId);
    }, [isMinimized, currentState]); // Added Dependencies

    const handleFeedback = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3000);
    };

    // DEBUG: Only show for local dev or specific users
    const showDebug = true; // For Soft Launch/Dev

    return (
        <div className="cipher-container">
            <header className="game-header">
                <h1>Cipher Squad</h1>
            </header>

            <div className="status-panel">
                <p><strong>System:</strong> {currentState}</p>
                <p><strong>Operative:</strong> {gameState.currentUser?.id || 'Initializing...'}</p>
                <div className="msg-area">{feedback}</div>
            </div>

            {showDebug && <GameControls onFeedback={handleFeedback} />}

            <VaultGrid onFeedback={handleFeedback} />

            {/* Modal Layer */}
            {selectedTile && (
                <TileDetailsModal
                    tile={selectedTile}
                    onClose={() => {
                        // If we own it, just minimize. If just viewing, clear.
                        const isOwner = selectedTile.claimedBy === gameState.currentUser?.id;
                        if (isOwner) {
                            setIsMinimized(true);
                            gameState.clearSelection();
                        } else {
                            gameState.clearSelection();
                        }
                    }}
                    onFeedback={handleFeedback}
                />
            )}

            <footer style={{ marginTop: '40px', fontSize: '0.7rem', color: '#444' }}>
                v1.1.1
            </footer>
        </div>
    );
};

export default CipherGame;

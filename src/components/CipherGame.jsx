import React, { useEffect, useState } from 'react';
import { gameState } from '../game/state/GameState';
import { loopController } from '../game/core/LoopController';
import VaultGrid from './VaultGrid';
import GameControls from './GameControls';

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

    // 1. Initialize Game on Mount
    useEffect(() => {
        // REAL IDENTITY SYNC
        let userCtx = { id: 'dev_local_' + Math.floor(Math.random() * 10000) };

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
        import('../game/actions/TileActions').then(({ fetchVault }) => {
            fetchVault();
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
            if (selId) {
                const tile = gameState.vault.getTile(selId);
                setSelectedTile(tile ? { ...tile } : null); // Copy to force re-render
            } else {
                setSelectedTile(null);
            }

            setLastTick(now);
        }, 100); // Faster polling for UI responsiveness

        return () => clearInterval(intervalId);
    }, []);

    const handleFeedback = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3000);
    };

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

            {/* <GameControls /> (Hidden for Soft Launch) */}

            <VaultGrid onFeedback={handleFeedback} />

            {/* Modal Layer */}
            {selectedTile && (
                <TileDetailsModal
                    tile={selectedTile}
                    onClose={() => gameState.clearSelection()}
                    onFeedback={handleFeedback}
                />
            )}

            <footer style={{ marginTop: '40px', fontSize: '0.7rem', color: '#444' }}>
                v1.1.0
            </footer>
        </div>
    );
};

export default CipherGame;

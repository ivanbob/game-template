import React, { useEffect, useState } from 'react';
import { gameState } from '../game/state/GameState';
import TileNode from './TileNodeV2';
import Leaderboard from '../game/Leaderboard';

const VaultGrid = ({ onFeedback }) => {
    const [tiles, setTiles] = useState([]);
    const [masterImage, setMasterImage] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Poll vault state for changes
    useEffect(() => {
        const syncVault = () => {
            // Convert Map to Array for rendering
            const gridArray = Array.from(gameState.vault.getTiles());
            setTiles(gridArray);

            // Check Global State
            const state = gameState.getCurrentState();
            if (state === 'VAULT_COMPLETE') {
                setIsComplete(true);
            }
        };

        // Sync immediately and on interval
        syncVault();
        const interval = setInterval(syncVault, 500);
        return () => clearInterval(interval);
    }, []);

    // Generate Master Image on Completion
    useEffect(() => {
        if (isComplete && tiles.length > 0 && !masterImage) {
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 150, 150);

            tiles.forEach(t => {
                // Parse Index from ID (last char usually)
                const parts = t.id.split('_t');
                const idx = parseInt(parts[1]) - 1; // 0-8
                if (isNaN(idx)) return;

                const rowChunk = Math.floor(idx / 3);
                const colChunk = idx % 3;

                const grid = t.data?.solutionGrid;
                if (grid) {
                    const offsetX = colChunk * 50;
                    const offsetY = rowChunk * 50;

                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 5; c++) {
                            if (grid[r][c] === 1) {
                                ctx.fillStyle = '#0f0';
                                ctx.fillRect(offsetX + c * 10, offsetY + r * 10, 10, 10);
                            }
                        }
                    }
                }
            });
            setMasterImage(canvas.toDataURL());
        }
    }, [isComplete, tiles, masterImage]);

    if (tiles.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Establishing secure connection...</div>;
    }

    return (
        <div>
            <div className="vault-grid">
                {tiles.map((tile) => (
                    <TileNode key={tile.id} tile={tile} onFeedback={onFeedback} />
                ))}
            </div>

            {isComplete && masterImage && !hasDismissed && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                    background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <h1 style={{ color: '#0f0', fontSize: '2rem', textShadow: '0 0 10px #0f0' }}>VAULT DECRYPTED</h1>

                    <div style={{ margin: '30px', border: '4px solid #0f0', width: '300px', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                        <img src={masterImage} alt="Master Pattern" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
                    </div>

                    <p style={{ color: '#fff', fontSize: '1.2rem' }}>Excellent work, Operatives.</p>
                    <p style={{ color: '#888', marginTop: '10px' }}>Syncing with Archive...</p>

                    <button
                        onClick={() => setHasDismissed(true)}
                        style={{
                            marginTop: '30px', padding: '10px 20px', background: 'transparent',
                            border: '1px solid #444', color: '#888', cursor: 'pointer'
                        }}
                    >
                        CLOSE SECURE CHANNEL
                    </button>

                    <button
                        onClick={() => {
                            setHasDismissed(true);
                            setShowLeaderboard(true);
                        }}
                        style={{
                            marginTop: '15px', padding: '10px 20px', background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid #0ff', color: '#0ff', cursor: 'pointer',
                            fontWeight: 'bold', letterSpacing: '2px'
                        }}
                    >
                        VIEW LEADERBOARD
                    </button>
                </div>
            )}

            {showLeaderboard && (
                <Leaderboard onClose={() => setShowLeaderboard(false)} />
            )}
        </div>
    );
};

export default VaultGrid;

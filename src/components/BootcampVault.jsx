import React, { useEffect, useState } from 'react';
import { gameState } from '../game/state/GameState';
import { GAME_STATES } from '../game/constants';
import TileNode from './TileNodeV2';

const BootcampVault = ({ onFeedback, onComplete }) => {
    const [tiles, setTiles] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [masterImage, setMasterImage] = useState(null);

    // Poll vault state for changes
    useEffect(() => {
        const syncVault = () => {
            const gridArray = Array.from(gameState.vault.getTiles());
            setTiles(gridArray);

            // Check completion locally for UI feedback
            if (gameState.getCurrentState() === GAME_STATES.BOOTCAMP_COMPLETE) {
                setIsComplete(true);
            }
        };

        syncVault();
        const interval = setInterval(syncVault, 500); // 500ms Tick
        return () => clearInterval(interval);
    }, []);

    // Generate Master Image on Completion
    useEffect(() => {
        if (isComplete && tiles.length > 0 && !masterImage) {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 100, 100);

            tiles.forEach(t => {
                const parts = t.id.split('_');
                const r = parseInt(parts[1]);
                const c = parseInt(parts[2]);
                if (isNaN(r) || isNaN(c)) return;

                const grid = t.data?.solutionGrid;
                if (grid) {
                    const tileOffsetX = c * 50;
                    const tileOffsetY = r * 50;
                    for (let gr = 0; gr < 5; gr++) {
                        for (let gc = 0; gc < 5; gc++) {
                            if (grid[gr][gc] === 1) {
                                ctx.fillStyle = '#0f0';
                                ctx.fillRect(tileOffsetX + (gc * 10), tileOffsetY + (gr * 10), 10, 10);
                            }
                        }
                    }
                }
            });
            setMasterImage(canvas.toDataURL());
        }
    }, [isComplete, tiles, masterImage]);

    const handleGraduate = () => {
        // In a real app, this would call an API to update user stats
        // For MVP/Proto, we just reload or transition locally
        // But since LoopController handles state, we might need a distinct action
        // For now, let's just callback to parent or reload to simulate "New Life"
        if (onComplete) onComplete();
    };

    if (tiles.length === 0) {
        return <div className="bootcamp-loading">Initializing Training Protocols...</div>;
    }

    return (
        <div className="bootcamp-container" style={{ padding: '20px', border: '2px solid #0f0' }}>
            <h2 style={{ color: '#0f0', textAlign: 'center', marginBottom: '10px' }}>:: BOOTCAMP PROTOCOL ::</h2>
            <div className="vault-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
                {tiles.map((tile) => (
                    <TileNode key={tile.id} tile={tile} onFeedback={onFeedback} isBootcamp={true} />
                ))}
            </div>

            {isComplete && (
                <div className="bootcamp-success-modal" style={{
                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                    background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <h1 style={{ color: '#0f0', fontSize: '2rem' }}>TRAINING COMPLETE</h1>

                    {masterImage && (
                        <div style={{ margin: '20px', border: '2px solid #0f0', width: '150px', height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                            <img src={masterImage} alt="Master Pattern" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
                        </div>
                    )}

                    <p style={{ color: '#fff', marginBottom: '20px' }}>You successfully revealed the pattern.</p>
                    <p style={{ color: '#888', marginBottom: '30px', fontSize: '0.9rem' }}>You are ready for the Vault.</p>
                    <button
                        onClick={handleGraduate}
                        style={{
                            padding: '15px 30px', background: '#0f0', color: '#000',
                            border: 'none', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer'
                        }}
                    >
                        ENTER LOBBY
                    </button>
                </div>
            )}
        </div>
    );
};

export default BootcampVault;

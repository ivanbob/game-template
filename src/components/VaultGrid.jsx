import React, { useEffect, useState } from 'react';
import { gameState } from '../game/state/GameState';
import TileNode from './TileNodeV2';

const VaultGrid = ({ onFeedback }) => {
    const [tiles, setTiles] = useState([]);

    // Poll vault state for changes
    useEffect(() => {
        const syncVault = () => {
            // Convert Map to Array for rendering
            const gridArray = Array.from(gameState.vault.getTiles());
            setTiles(gridArray);
        };

        // Sync immediately and on interval
        syncVault();
        const interval = setInterval(syncVault, 500);
        return () => clearInterval(interval);
    }, []);

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
        </div>
    );
};

export default VaultGrid;

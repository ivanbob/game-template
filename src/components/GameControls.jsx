import React from 'react';
import { gameState } from '../game/state/GameState';
import { TILE_STATUS } from '../game/constants';

const GameControls = () => {

    // Helper to Reset State for Testing
    const resetVault = () => {
        gameState.vault.load({
            grid: [
                { id: 't1', status: TILE_STATUS.OPEN, data: { solution: { val: 1 } } },
                { id: 't2', status: TILE_STATUS.OPEN, data: { solution: { val: 2 } } },
                { id: 't3', status: TILE_STATUS.LOCKED, data: { solution: { val: 3 } } },
                { id: 't4', status: TILE_STATUS.OPEN, data: { solution: { val: 4 } } },
                { id: 't5', status: TILE_STATUS.OPEN, data: { solution: { val: 5 } } },
                { id: 't6', status: TILE_STATUS.OPEN, data: { solution: { val: 6 } } },
                { id: 't7', status: TILE_STATUS.OPEN, data: { solution: { val: 7 } } },
                { id: 't8', status: TILE_STATUS.OPEN, data: { solution: { val: 8 } } },
                { id: 't9', status: TILE_STATUS.OPEN, data: { solution: { val: 9 } } }
            ]
        });
        alert('Vault Reset to Initial State');
    };

    const forceExpire = () => {
        // Manually expire all claimed tiles
        const now = Date.now();
        gameState.vault.getTiles().forEach(t => {
            if (t.status === TILE_STATUS.CLAIMED) {
                gameState.vault.updateTile(t.id, { lockExpiry: now - 1000 });
            }
        });
        alert('Active locks forced to expire. Wait for next tick.');
    };

    return (
        <div style={{ border: '1px dashed red', padding: '10px' }}>
            <h4>Debug Controls</h4>
            <button onClick={resetVault} style={{ marginRight: '10px' }}>Reset Vault (Load 3x3)</button>
            <button onClick={forceExpire}>Force Lock Expiry</button>
        </div>
    );
};

export default GameControls;

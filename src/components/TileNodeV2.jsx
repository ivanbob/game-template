import React from 'react';
import { TILE_STATUS } from '../game/constants';
import { gameState } from '../game/state/GameState';

// V2 Component - Forces cache bust
const TileNodeV2 = ({ tile, onFeedback }) => {
    const isOwner = tile.claimedBy === gameState.currentUser?.id;

    // Determine CSS State Class
    let stateClass = '';
    if (tile.status === TILE_STATUS.OPEN) stateClass = 'state-open';
    else if (tile.status === TILE_STATUS.SOLVED) stateClass = 'state-solved';
    else if (tile.status === TILE_STATUS.CLAIMED) {
        stateClass = isOwner ? 'state-claimed-me' : 'state-claimed-other';
    }

    const handleClick = () => {
        // Spec: INT_TAP_TILE -> TILE_FOCUSED
        gameState.selectTile(tile.id);
    };

    return (
        <div className={`tile-card ${stateClass}`} onClick={handleClick}>
            <span className="tile-id" style={{ fontWeight: 'bold' }}>{tile.id}</span>
            <div className="tile-status">{tile.status}</div>

            {/* Visual Indicators only - No Buttons */}
            {tile.status === TILE_STATUS.CLAIMED && isOwner && (
                <div style={{ fontSize: '0.8rem', color: '#ffd700' }}>YOUR LOCK</div>
            )}
            {tile.status === TILE_STATUS.CLAIMED && !isOwner && (
                <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>LOCKED</div>
            )}
        </div>
    );
};

export default TileNodeV2;

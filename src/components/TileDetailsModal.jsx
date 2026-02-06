import React, { useState } from 'react';
import { gameState } from '../game/state/GameState';
import { claimTile, solveTile, releaseTile } from '../game/actions/TileActions';
import { TILE_STATUS } from '../game/constants';

const TileDetailsModal = ({ tile, onClose, onFeedback }) => {
    if (!tile) return null;

    const isOwner = tile.claimedBy === gameState.currentUser?.id;
    const isSubmitting = gameState.isSubmitting;
    const [solutionInput, setSolutionInput] = useState('');

    const handleClaim = async () => {
        const res = await claimTile(tile.id);
        if (!res.success) onFeedback(`Claim Failed: ${res.error}`);
        // Success handled by auto-transition in GameState/Action
    };

    const handleSolve = async () => {
        // Simple numeric validation for V1
        const val = parseInt(solutionInput, 10);
        if (isNaN(val)) {
            onFeedback('Enter a valid number');
            return;
        }

        const res = await solveTile(tile.id, { val });
        if (res.success) {
            onFeedback('✓ SHARD RECOVERED');
        } else {
            onFeedback(`Solve Failed: ${res.error}`);
        }
    };

    const handleRelease = async () => {
        await releaseTile(tile.id);
        onClose(); // Explicit close for release
    };

    return (
        <div className="modal-backdrop" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div className="modal-content" style={{
                backgroundColor: '#111', border: '1px solid #0f0', padding: '20px',
                maxWidth: '300px', width: '90%', boxShadow: '0 0 20px rgba(0,255,0,0.2)'
            }} onClick={(e) => e.stopPropagation()}>

                <h2 style={{ marginTop: 0, color: '#0f0' }}>{tile.id}</h2>
                <div style={{ marginBottom: '10px' }}>{tile.data?.clue || 'No Data'}</div>

                <div className="status-badge" style={{ marginBottom: '20px', padding: '5px', border: '1px solid #333' }}>
                    {tile.status} {tile.claimedBy ? `by ${tile.claimedBy}` : ''}
                </div>

                {/* Actions */}
                {isSubmitting ? (
                    <div style={{ color: '#ff0' }}>TRANSMITTING...</div>
                ) : (
                    <>
                        {tile.status === TILE_STATUS.OPEN && (
                            <button className="btn-primary" style={{ width: '100%' }} onClick={handleClaim}>
                                CLAIM TILE
                            </button>
                        )}

                        {tile.status === TILE_STATUS.CLAIMED && isOwner && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="number"
                                    placeholder="Enter Solution..."
                                    value={solutionInput}
                                    onChange={(e) => setSolutionInput(e.target.value)}
                                    style={{ padding: '10px', background: '#000', color: '#0f0', border: '1px solid #333' }}
                                />
                                <button className="btn-action" onClick={handleSolve}>SUBMIT SOLUTION</button>
                                <button onClick={handleRelease} style={{ background: 'transparent', border: '1px solid #666', color: '#888' }}>
                                    RELEASE LOCK
                                </button>
                            </div>
                        )}

                        {tile.status === TILE_STATUS.CLAIMED && !isOwner && (
                            <div style={{ color: '#888' }}>
                                LOCKED by another operative.
                            </div>
                        )}

                        {tile.status === TILE_STATUS.SOLVED && (
                            <div style={{ color: '#0ff' }}>
                                Solved by {tile.completedBy}
                            </div>
                        )}
                    </>
                )}

                <button onClick={onClose} style={{ marginTop: '20px', width: '100%', background: '#222', border: 'none', padding: '10px', color: '#fff' }}>
                    CLOSE
                </button>
            </div>
        </div>
    );
};

export default TileDetailsModal;

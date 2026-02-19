import React, { useState, useEffect } from 'react';
import PuzzleGrid from './PuzzleGrid';
import { puzzleEngine } from '../game/logic/PuzzleEngine';
import { gameState } from '../game/state/GameState';
import { claimTile, solveTile, releaseTile } from '../game/actions/TileActions';
import { TILE_STATUS } from '../game/constants';

const TileDetailsModal = ({ tile, onClose, onFeedback }) => {
    if (!tile) return null;

    const isOwner = tile.claimedBy === gameState.currentUser?.id;
    const isSubmitting = gameState.isSubmitting;

    console.log('[TileDetailsModal] Render:', { id: tile.id, status: tile.status, isOwner, user: gameState.currentUser?.id });

    // Draft Key
    const draftKey = `cs_draft_${gameState.currentUser?.id}_${tile.id}`;

    // Initialize Grid State
    const [gridState, setGridState] = useState(() => {
        // 1. Try Recover Draft
        const saved = localStorage.getItem(draftKey);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        // 2. Default Empty 10x10
        return Array(5).fill(0).map(() => Array(5).fill(0));
    });

    // Generate Clues (Mock/Deterministic for V1 Migration)
    const [puzzleData, setPuzzleData] = useState(() => {
        try {
            console.log('[TileDetailsModal] Generating Clues. Tile Data:', tile.data);
            if (tile.data?.solutionGrid) {
                console.log('[TileDetailsModal] Using Real Solution Grid:', tile.data.solutionGrid);
                return {
                    clues: puzzleEngine.generateClues(tile.data.solutionGrid),
                    solution: tile.data.solutionGrid
                };
            } else {
                console.warn('[TileDetailsModal] Missing solutionGrid. Fallback to Mock.');
                // Mock Generator: Diagonals based on ID parity
                const mockGrid = Array(5).fill(0).map((_, r) =>
                    Array(5).fill(0).map((_, c) => (r === c || r === 4 - c) ? 1 : 0)
                );
                return {
                    clues: puzzleEngine.generateClues(mockGrid),
                    solution: mockGrid
                };
            }
        } catch (e) {
            console.error('[TileDetailsModal] Logic Error:', e);
            // Fallback to empty safe grid
            const safeGrid = Array(5).fill(0).map(() => Array(5).fill(0));
            return { clues: { rows: [], cols: [] }, solution: safeGrid };
        }
    });

    // Auto-Save Draft
    useEffect(() => {
        if (isOwner) {
            const handler = setTimeout(() => {
                localStorage.setItem(draftKey, JSON.stringify(gridState));
            }, 500);
            return () => clearTimeout(handler);
        }
    }, [gridState, isOwner, draftKey]);

    // Local Feedback State
    const [localFeedback, setLocalFeedback] = useState(null);
    const [showSolution, setShowSolution] = useState(false); // Debug State

    // clear feedback on change
    useEffect(() => {
        setLocalFeedback(null);
        setShowSolution(false);
    }, [tile.id, gridState]);

    const handleFeedback = (msg, isError = false) => {
        setLocalFeedback({ msg, isError });
        if (onFeedback) onFeedback(msg); // Bubble up as well

        if (isError) {
            setTimeout(() => setLocalFeedback(null), 3000);
        }
    };

    // DEBUG: Overlay Solution
    // If showSolution is true, we render the solution grid lightly over the puzzle or just replace it?
    // Let's replace providing a toggle.
    const displayGrid = showSolution && puzzleData.solution ? puzzleData.solution : gridState;

    const handleClaim = async () => {
        const res = await claimTile(tile.id);
        if (!res.success) handleFeedback(`Claim Failed: ${res.error}`, true);
    };

    const handleSolve = async () => {
        // Validate Locally first
        // We construct a mock "tileData" because our real tile might lack the solution grid in V1 DB
        const mockTileData = { data: { solutionGrid: puzzleData.solution } };
        const validation = puzzleEngine.validateSolution(mockTileData, gridState);

        if (!validation.valid) {
            handleFeedback('Puzzle Incorrect. Check Clues.', true);
            return;
        }

        const res = await solveTile(tile.id, gridState);
        if (res.success) {
            localStorage.removeItem(draftKey);
            handleFeedback('✓ SHARD RECOVERED', false);
        } else {
            handleFeedback(`Solve Failed: ${res.error}`, true);
        }
    };

    const handleRelease = async () => {
        await releaseTile(tile.id);
        localStorage.removeItem(draftKey);
        onClose(); // This will just close, and since we released, no more lock -> no auto-open
    };

    // Safety Render
    try {
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                    {/* Compact Header */}
                    <div className="modal-header-compact">
                        <div style={{ color: '#0f0', fontWeight: 'bold' }}>{tile.id}</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>
                            {tile.status} {tile.claimedBy ? `by ${tile.claimedBy}` : ''}
                        </div>
                        <button onClick={() => setShowSolution(!showSolution)} style={{ fontSize: '0.7rem', background: '#333', color: '#fff', border: '1px solid #666', cursor: 'pointer', padding: '2px 5px' }}>
                            {showSolution ? 'HIDE' : 'PEEK'}
                        </button>
                    </div>

                    {/* Local Feedback Area - Only show if active */}
                    {localFeedback && (
                        <div style={{
                            marginBottom: '5px', padding: '5px', textAlign: 'center', fontSize: '0.8rem',
                            backgroundColor: localFeedback.isError ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)',
                            color: localFeedback.isError ? '#ff4444' : '#0f0',
                            border: `1px solid ${localFeedback.isError ? '#f00' : '#0f0'}`
                        }}>
                            {localFeedback.msg}
                        </div>
                    )}

                    {/* Content Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {isSubmitting ? (
                            <div style={{ color: '#ff0', textAlign: 'center', padding: '20px' }}>TRANSMITTING...</div>
                        ) : (
                            <>
                                {tile.status === 'OPEN' && (
                                    <button className="btn-primary" style={{ width: '100%', padding: '15px', background: '#0f0', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} onClick={handleClaim}>
                                        CLAIM TILE & START
                                    </button>
                                )}

                                {tile.status === 'CLAIMED' && isOwner && (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                        <PuzzleGrid
                                            clues={puzzleData.clues}
                                            initialGrid={displayGrid}
                                            onGridChange={showSolution ? () => { } : setGridState}
                                        />

                                        {/* Sticky Footer Actions */}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%' }}>
                                            <button onClick={handleRelease} style={{ flex: 1, background: 'transparent', border: '1px solid #666', color: '#888', padding: '10px', cursor: 'pointer' }}>
                                                GIVE UP
                                            </button>
                                            <button className="btn-action" onClick={handleSolve} style={{ flex: 2, padding: '10px', background: '#00f', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                                SUBMIT
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {tile.status === 'CLAIMED' && !isOwner && (
                                    <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                                        🔒 LOCKED by operative {tile.claimedBy}
                                    </div>
                                )}

                                {tile.status === 'SOLVED' && (
                                    <div style={{ color: '#0ff', textAlign: 'center', padding: '20px' }}>
                                        ✓ Solved by {tile.completedBy}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <button onClick={onClose} style={{ marginTop: '10px', width: '100%', background: '#222', border: 'none', padding: '10px', color: '#555', cursor: 'pointer', fontSize: '0.8rem' }}>
                        {(tile.status === 'CLAIMED' && isOwner) ? 'MINIMIZE' : 'CLOSE'}
                    </button>
                </div>
            </div>
        );
    } catch (err) {
        console.error('[TileDetailsModal] Render Error:', err);
        return <div style={{ position: 'fixed', top: 0, left: 0, padding: '20px', color: 'red', zIndex: 99999 }}>RENDER CRASH: {err.message}</div>;
    }
};

export default TileDetailsModal;

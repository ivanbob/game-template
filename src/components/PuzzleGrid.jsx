import React, { useState, useEffect, useRef } from 'react';
import { puzzleEngine } from '../game/logic/PuzzleEngine';

const CELL_SIZE = 24; // px

const CELL = {
    EMPTY: 0,
    FILLED: 1,
    MARKED: 2
};

const PuzzleGrid = ({ clues, onGridChange, initialGrid, isInteractive = true }) => {
    // 10x10 Grid state
    const [grid, setGrid] = useState(initialGrid || Array(10).fill(0).map(() => Array(10).fill(CELL.EMPTY)));
    const [mode, setMode] = useState(CELL.FILLED); // Draw Mode: FILLED vs MARKED
    const isDragging = useRef(false);
    const dragStartVal = useRef(null); // What are we painting? (Toggle logic)

    // Notify parent on change
    useEffect(() => {
        onGridChange(grid);
    }, [grid]);

    const toggleCell = (r, c) => {
        if (!isInteractive) return;

        const currentVal = grid[r][c];
        let newVal = currentVal;

        // Smart Toggle Logic
        if (mode === CELL.FILLED) {
            newVal = (currentVal === CELL.FILLED) ? CELL.EMPTY : CELL.FILLED;
        } else {
            newVal = (currentVal === CELL.MARKED) ? CELL.EMPTY : CELL.MARKED;
        }

        // Update Grid
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = newVal;
        setGrid(newGrid);
        return newVal;
    };

    const handlePointerDown = (r, c, e) => {
        if (!isInteractive) return;
        e.preventDefault(); // Prevent scroll
        isDragging.current = true;

        // Determine "Paint" value based on start cell
        const resultVal = toggleCell(r, c);
        dragStartVal.current = resultVal;
    };

    const handlePointerEnter = (r, c) => {
        if (!isDragging.current || !isInteractive) return;

        // Apply same operation as start (Paint vs Erase)
        const currentVal = grid[r][c];
        const targetVal = dragStartVal.current;

        // Only modify if it matches the "target layer" logic
        // E.g. if I started painting FILLED, I should overwrite EMPTY but maybe not MARKED (depending on UX)
        // Simple V1: Overwrite everything to Target

        if (currentVal !== targetVal) {
            const newGrid = grid.map(row => [...row]);
            newGrid[r][c] = targetVal;
            setGrid(newGrid);
        }
    };

    const handlePointerUp = () => {
        isDragging.current = false;
        dragStartVal.current = null;
    };

    // Global pointer up to catch releases outside grid
    useEffect(() => {
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, []);

    // Clue Safety Check
    if (!clues || !clues.rows || !clues.cols) {
        console.error('[PuzzleGrid] Missing clues:', clues);
        return <div style={{ color: 'red' }}>Error: Invalid Puzzle Data</div>;
    }

    // Render Clues
    const { rows, cols } = clues;

    return (
        <div className="puzzle-game-container">
            {/* Mode Toggle - Kept Same */}
            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                <button
                    className={mode === CELL.FILLED ? 'btn-mode active' : 'btn-mode'}
                    onClick={() => setMode(CELL.FILLED)}
                    style={{ background: mode === CELL.FILLED ? '#0f0' : '#333', color: mode === CELL.FILLED ? '#000' : '#fff', padding: '5px 15px', border: 'none', borderRadius: '5px' }}
                >
                    DRAW ■
                </button>
                <button
                    className={mode === CELL.MARKED ? 'btn-mode active' : 'btn-mode'}
                    onClick={() => setMode(CELL.MARKED)}
                    style={{ background: mode === CELL.MARKED ? '#f00' : '#333', color: mode === CELL.MARKED ? '#fff' : '#fff', padding: '5px 15px', border: 'none', borderRadius: '5px' }}
                >
                    MARK X
                </button>
            </div>

            {/* Responsive Grid Structure */}
            <div className="puzzle-game-board" style={{ width: '100%', maxWidth: '400px' }}>

                {/* Top: Spacer + Col Clues */}
                <div className="puzzle-row-container">
                    <div className="clue-row-area" style={{ visibility: 'hidden' }}></div> {/* Spacer */}
                    <div className="clue-col-area">
                        {cols.map((colClues, i) => (
                            <div key={i} className="clue-col-item">
                                {colClues.map((num, idx) => <div key={idx}>{num}</div>)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom: Row Clues + Grid */}
                <div className="puzzle-row-container">
                    <div className="clue-row-area">
                        {rows.map((rowClues, i) => (
                            <div key={i} className="clue-row-item">
                                {rowClues.join(' ')}
                            </div>
                        ))}
                    </div>

                    <div
                        className="grid-board-responsive"
                        style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 10}, 1fr)` }}
                        onPointerLeave={handlePointerUp}
                    >
                        {grid.map((row, r) => (
                            row.map((cellState, c) => (
                                <div
                                    key={`${r}-${c}`}
                                    className={`grid-cell-responsive ${cellState === CELL.FILLED ? 'filled' : ''}`}
                                    onPointerDown={(e) => handlePointerDown(r, c, e)}
                                    onPointerEnter={() => handlePointerEnter(r, c)}
                                >
                                    {cellState === CELL.MARKED && '×'}
                                </div>
                            ))
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PuzzleGrid;

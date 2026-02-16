/**
 * @file PuzzleEngine.js
 * @description Handles client-side puzzle interactions and validation.
 * Pure logic engine: Input + State -> Output. No external dependencies.
 */

class PuzzleEngine {
    constructor() {
        // Future: Register specific definitions for different puzzle types
    }

    /**
     * Validates a player's submission against the tile's data.
     * Deterministically checks if input matches expected solution.
     * 
     * @param {Object} tileData - The full tile object (must contain .data.solution)
     * @param {Object} userInput - The player's proposed solution
     * @returns {Object} { valid: boolean, error?: string }
     */
    /**
     * Validates a player's submission against the tile's data.
     * @param {Object} tileData - The full tile object
     * @param {Object} userInput - The player's proposed solution (10x10 grid)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateSolution(tileData, userInput) {
        if (!tileData || !tileData.data) return { valid: false, error: "MISSING_PUZZLE_DATA" };

        // V1: Solution is part of tile data (server provided or self-contained)
        const expectedGrid = tileData.data.solutionGrid || tileData.solution;

        if (!expectedGrid) return { valid: false, error: "MISSING_SOLUTION_DEFINITION" };
        if (!userInput || !Array.isArray(userInput)) return { valid: false, error: "INVALID_INPUT_FORMAT" };

        // Compare Grids
        try {
            // Flatten and compare
            const flatInput = userInput.flat();
            const flatExpected = expectedGrid.flat();

            if (flatInput.length !== flatExpected.length) {
                return { valid: false, error: "DIMENSION_MISMATCH" };
            }

            for (let i = 0; i < flatInput.length; i++) {
                // strict equality: 1=FILLED, 0=EMPTY. 
                // MARKED(2) should be treated as EMPTY(0) for validation
                const inVal = flatInput[i] === 1 ? 1 : 0;
                const exVal = flatExpected[i] === 1 ? 1 : 0;

                if (inVal !== exVal) {
                    return { valid: false, error: "INCORRECT_SOLUTION" };
                }
            }

            return { valid: true };
        } catch (e) {
            console.error('[PuzzleEngine] Validation Exception:', e);
            return { valid: false, error: "MALFORMED_INPUT" };
        }
    }

    /**
     * Generates Nonogram clues (RLE) from a binary grid.
     * @param {number[][]} grid - 10x10 matrix (0/1)
     * @returns {Object} { rows: number[][], cols: number[][] }
     */
    generateClues(grid) {
        if (!grid || grid.length === 0) return { rows: [], cols: [] };

        const rows = grid.map(row => this._rle(row));

        const cols = [];
        for (let x = 0; x < grid[0].length; x++) {
            const col = [];
            for (let y = 0; y < grid.length; y++) {
                col.push(grid[y][x]);
            }
            cols.push(this._rle(col));
        }

        return { rows, cols };
    }

    /**
     * Run-Length Encoding helper
     * [0, 1, 1, 0, 1] -> [2, 1]
     */
    _rle(arr) {
        const result = [];
        let count = 0;
        for (let val of arr) {
            // Treat 1 as Filled
            if (val === 1) {
                count++;
            } else {
                if (count > 0) result.push(count);
                count = 0;
            }
        }
        if (count > 0) result.push(count);
        return result.length > 0 ? result : [0];
    }
}

export const puzzleEngine = new PuzzleEngine();

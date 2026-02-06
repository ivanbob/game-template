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
    validateSolution(tileData, userInput) {
        if (!tileData || !tileData.data) {
            return { valid: false, error: "MISSING_PUZZLE_DATA" };
        }

        // 1. Check Data Integrity
        const { solution } = tileData.data;
        if (!solution) {
            return { valid: false, error: "MISSING_SOLUTION_DEFINITION" };
        }

        if (!userInput) {
            return { valid: false, error: "EMPTY_INPUT" };
        }

        // 2. Deterministic Validation Logic
        // For V1, we assume a strict equality of the solution object.
        // In a real Nonogram implementation, this would compare grid states.

        try {
            // Using JSON serialization for deterministic structural equality (V1 Stub)
            // TODO: Replace with type-specific validator (e.g. NonogramValidator.check(userInput, solution))
            const inputHash = JSON.stringify(userInput);
            const targetHash = JSON.stringify(solution);

            if (inputHash === targetHash) {
                return { valid: true };
            } else {
                return { valid: false, error: "INCORRECT_SOLUTION" };
            }
        } catch (e) {
            console.error('[PuzzleEngine] Validation Exception:', e);
            return { valid: false, error: "MALFORMED_INPUT" };
        }
    }

    /**
     * Generates a mock puzzle for testing the UI without backend.
     * @returns {Object} { type, clues, solution }
     */
    generateMockPuzzle() {
        return {
            type: 'NONOGRAM',
            clues: { rows: [[1], [1]], cols: [[1], [1]] },
            gridSize: 2,
            solution: [[1, 0], [0, 1]] // Mock solution
        };
    }
}

export const puzzleEngine = new PuzzleEngine();

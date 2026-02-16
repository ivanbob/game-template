# Mechanics Spec: Puzzle Logic (Nonogram V1)

## 1. Overview
The core gameplay of Cipher Squad is solving **Nonogram** (Picross) puzzles. Each 10x10 grid represents a "Tile" of the daily vault.

## 2. Puzzle Data Structure

### 2.1 Grid Representation
The grid is a 10x10 matrix of Cell States.
```javascript
// Cell States
const CELL = {
    EMPTY: 0,
    FILLED: 1,
    MARKED: 2  // 'X' marker (User utility only, treating as Empty for validation)
};
```

### 2.2 Clue Data
Clues are generated from the Solution Grid.
```json
{
    "rows": [[3], [1, 5], [2, 2], ...], // Top-to-Bottom
    "cols": [[1], [5], [1, 1, 1], ...]  // Left-to-Right
}
```

## 3. Interaction Design

### 3.1 Input Mapping
| Interaction | Effect |
| :--- | :--- |
| **Tap (Empty)** | Toggle **FILLED** |
| **Tap (Filled)** | Toggle **EMPTY** |
| **Long Press / Right Click** | Toggle **MARKED** (X) |

*Note: For V1 on Mobile, we may need a specific "Mode Toggle" button (Draw vs X) if Long Press is unreliable.*

### 3.2 Drag Support (Critical for Feel)
- **Start Drag on Empty:** Fills target cells.
- **Start Drag on Filled:** Empties target cells.
- **Smart Drag:** If dragging starts on Empty, it only affects Empty cells (filling them) and ignores already Filled cells.

## 4. Draft Recovery
- **Key:** `cs_draft_${userId}_${tileId}`
- **Trigger:** Auto-save on every move (debounced 500ms).
- **Restore:** On `claimTile` success, check LocalStorage. If valid draft exists, hydrate grid.
- **Clear:** On `solveTile` success or `releaseTile`.

## 5. Validation Logic
### 5.1 Client-Side (Feedback)
- **Pre-Submit Check:** Ensure `SolutionGrid` matches `Clues`.
- **Note:** Real comparison is user's `InputGrid` vs `ActiveTile.Solution`.

### 5.2 Server-Side (Authoritative)
- Endpoint: `/api/game/vault/solve`
- Payload: ` { tileId, solution: [ [0,1...], ... ] } `
- Check: Exact match against Server Master Solution.

## 6. Generation (V1 Stub)
For V1, since we don't have the AI Generator yet, we will use a **Static Set** of valid Nonograms or a pseudo-random seed that acts as "Daily Content".

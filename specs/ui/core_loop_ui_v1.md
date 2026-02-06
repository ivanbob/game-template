# UI Logic Specification: Core Loop (Hub Screen)

## Metadata
- **ID:** `ui_core_loop_v1`
- **Related Spec:** `specs/mechanics/daily_vault_v1.md`
- **Target Component:** `HubScreen`
- **Status:** APPROVED

## 1. UI Intent Summary
The Hub Screen is the primary interface for Cipher Squad. It manages the daily cycle transition (Lobby <-> Vault), the grid interaction (Claims/Solves), and the feedback loop for async actions. Ideally, it should feel like a "live" tactical board.

## 2. Declared States

| State ID | Description | Visual/Logical Context |
| :--- | :--- | :--- |
| `BOOT` | Application initialization & Auth check. | Spinner/Logo. Blocked interactions. |
| `LOBBY` | Pre-game or Post-game state. Waiting for next vault. | Countdown timer. Stats summary. Vault locked. |
| `VAULT_ACTIVE` | The Vault is open and playable. Grid is interactive. | 8x8 Grid. HUD visible. |
| `TILE_FOCUSED` | A specific tile is selected for inspection/action. | Bottom Sheet / Modal open with tile details. |
| `ACTION_SUBMITTING` | An async transaction (Claim/Solve) is in flight. | Optimistic UI update or spinner on specific tile. Global input block. |
| `ERROR_FEEDBACK` | Transient error state (e.g., "Tile already claimed"). | Toast/Snackbar or non-blocking alert. |

## 3. Interaction Model

### 3.1 State Transitions

| ID | Trigger | From State | To State | Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| `INT_INIT_SUCCESS` | Auth & Data Load Complete | `BOOT` | `VAULT_ACTIVE` OR `LOBBY` | based on `vault.status` |
| `INT_INIT_FAIL` | Auth/Network Logic Failure | `BOOT` | `BOOT` | Show Retry Button |
| `INT_TAP_TILE` | User Taps Grid Cell | `VAULT_ACTIVE` | `TILE_FOCUSED` | Set `selectedTileId` |
| `INT_CLOSE_TILE` | User Taps X / Backdrop | `TILE_FOCUSED` | `VAULT_ACTIVE` | Clear `selectedTileId` |
| `INT_CLAIM_START` | User Taps "Claim" | `TILE_FOCUSED` | `ACTION_SUBMITTING` | Optimistic: Lock Tile UI |
| `INT_SOLVE_START` | User Taps "Attmpt Solve" | `TILE_FOCUSED` | `ACTION_SUBMITTING` | Optimistic: None |
| `INT_ACTION_SUCCESS`| Server 200 OK | `ACTION_SUBMITTING`| `VAULT_ACTIVE` | Update Grid Data |
| `INT_ACTION_FAIL` | Server 4xx/5xx | `ACTION_SUBMITTING`| `ERROR_FEEDBACK` -> `VAULT_ACTIVE` | Revert Optimistic State |

### 3.2 Constraints

- **Max Simultaneous Actions:** `1` (User cannot claim two tiles at once).
- **Time Pressure:** `High` (Race conditions possible).
- **Disable On Error:** `False` (Allow retry immediately).
- **Input Block:** `Strict` during `ACTION_SUBMITTING`.

## 4. Failure Handling

| Failure Type | UI Behavior | Recovery |
| :--- | :--- | :--- |
| **Network Error** | Show persistent "Reconnecting..." header. | Auto-retry w/ backoff. |
| **Optimistic Mismatch** | (e.g., Tile was taken while user looked at it) | Show Toast: "Too late! Tile taken." -> Refresh Grid. | Auto-refresh `vault` data. |
| **Auth Expiry** | Full blocking error screen. | "Reload App" button. |

## 5. Risk Flags
- [ ] **Race Conditions:** High probability of users trying to claim/solve same tile. UI MUST handle 409 Conflict gracefully without crashing.
- [ ] **Stale Data:** Grid might become stale if user idle. Polling or WebSocket (future) needed. V1 relies on "action-triggered" refresh.

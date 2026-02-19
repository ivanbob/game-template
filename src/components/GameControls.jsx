import React, { useState } from 'react';
import { gameState } from '../game/state/GameState';
import Leaderboard from '../game/Leaderboard';
import { claimTile, solveTile } from '../game/actions/TileActions';
import { TILE_STATUS } from '../game/constants';

const GameControls = ({ onFeedback }) => {
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Helper to Reset State for Testing
    const handleReseed = async () => {
        if (!confirm('This will wipe the current daily vault and generate a new one. Continue?')) return;

        try {
            await fetch('https://cipher-squad-worker.jikoentcompany.workers.dev/api/game/vault/admin/seed', {
                method: 'POST',
                headers: { 'X-Admin-Key': 'dev-key-ignore-for-now' }
            }).then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || res.statusText);
                }
                return res.json();
            });
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Failed to reseed vault.');
        }
    };

    // Helper to Auto-Solve All Tiles (Debug)
    const handleAutoSolve = async () => {
        if (!confirm('🪄 MAGIC: Auto-Solving all remaining tiles...')) return;

        // FIX BUG-027: Use getTiles() iterator instead of undefined .grid property
        const allTiles = Array.from(gameState.vault.getTiles());
        const openTiles = allTiles.filter(t => t.status === TILE_STATUS.OPEN);

        console.log(`[AutoSolve] Found ${openTiles.length} open tiles.`);

        if (openTiles.length === 0) {
            alert('No open tiles found to solve!');
            return;
        }

        for (const tile of openTiles) {
            console.log(`[AutoSolve] Processing Tile ${tile.id}...`);

            // 1. Claim
            await claimTile(tile.id);

            // 2. Solve (using known solutionGrid from polyfill)
            if (tile.data && tile.data.solutionGrid) {
                await solveTile(tile.id, tile.data.solutionGrid);
            } else {
                console.warn(`[AutoSolve] Tile ${tile.id} missing solutionGrid! Skipping.`);
            }

            // Artificial delay to prevent race conditions/rate limits
            await new Promise(r => setTimeout(r, 200));
        }

        // Force Refresh to show Vault Completion
        window.location.reload();
    };

    const handleShowMaster = () => {
        // Collect all tiles from vault
        const tiles = Array.from(gameState.vault.getTiles());
        if (tiles.length === 0) {
            alert('Vault is empty.');
            return;
        }

        // We expect 9 tiles (3x3). Let's try to reconstruct.
        // ID format: YYYY-MM-DD_t1 ... t9.
        // We know t1..t3 is row 0, t4..t6 row 1, etc.

        let canvas = document.createElement('canvas');
        canvas.width = 150; // 15px * 10scale
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 150, 150);

        // Detect Bootcamp ID format (b_0_0)
        const isBootcamp = tiles.some(t => t.id.startsWith('b_'));

        if (isBootcamp) {
            // BOOTCAMP RENDER (2x2)
            // Canvas: 2 tiles * 50px = 100px
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 100, 100);

            tiles.forEach(t => {
                // b_row_col
                const parts = t.id.split('_');
                const r = parseInt(parts[1]);
                const c = parseInt(parts[2]);

                if (isNaN(r) || isNaN(c)) return;

                if (isNaN(r) || isNaN(c)) return;

                const grid = t.data?.solutionGrid;

                // If we have grid data, draw it relative to tile position
                if (grid) {
                    // Each tile is 5x5 pixels physically in this 10x10 map representation
                    // We map each grid cell to a 10x10 px block on canvas (since canvas is 100x100)
                    // Tile 0,0 starts at x=0, y=0
                    // Tile 0,1 starts at x=50, y=0
                    // Inside tile, cell 0,0 is at offset

                    const tileOffsetX = c * 50;
                    const tileOffsetY = r * 50;

                    for (let gr = 0; gr < 5; gr++) {
                        for (let gc = 0; gc < 5; gc++) {
                            if (grid[gr][gc] === 1) {
                                ctx.fillStyle = '#0f0'; // Green Heart
                                ctx.fillRect(tileOffsetX + (gc * 10), tileOffsetY + (gr * 10), 10, 10);
                            }
                            // Optional: Grid lines
                            ctx.strokeStyle = '#222';
                            ctx.strokeRect(tileOffsetX + (gc * 10), tileOffsetY + (gr * 10), 10, 10);
                        }
                    }
                } else {
                    // Fallback
                    ctx.strokeStyle = '#0f0';
                    ctx.strokeRect(c * 50, r * 50, 50, 50);
                    ctx.fillStyle = '#0f0';
                    ctx.fillText('?', c * 50 + 20, r * 50 + 30);
                }
            });

            openPreview(canvas, 'Bootcamp Master Pattern');
            return;
        }

        // STANDARD GAME RENDER (3x3 of 5x5 grids)
        tiles.forEach(t => {
            // Parse Index from ID (last char usually)
            const parts = t.id.split('_t');
            const idx = parseInt(parts[1]) - 1; // 0-8
            if (isNaN(idx)) return;

            const rowChunk = Math.floor(idx / 3);
            const colChunk = idx % 3;

            // Get Grid (solutions only available if seeded via new logic or exposed)
            // The frontend 'gameState' stores what backend sent.
            // My changes to index.ts put solutionGrid in data.
            const grid = t.data?.solutionGrid;

            if (grid) {
                // Draw 5x5 grid at offset
                const offsetX = colChunk * 50; // 5 * 10 scale
                const offsetY = rowChunk * 50;

                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        if (grid[r][c] === 1) {
                            ctx.fillStyle = '#0f0';
                            ctx.fillRect(offsetX + c * 10, offsetY + r * 10, 9, 9);
                        } else {
                            ctx.strokeStyle = '#222';
                            ctx.strokeRect(offsetX + c * 10, offsetY + r * 10, 10, 10);
                        }
                    }
                }
            } else {
                // Fallback Text
                ctx.fillStyle = '#fff';
                ctx.font = '20px monospace';
                ctx.fillText((idx + 1).toString(), colChunk * 50 + 20, rowChunk * 50 + 30);
            }
        });

        openPreview(canvas, 'Master Image Preview');
    };

    const openPreview = (canvas, title) => {
        const win = window.open();
        if (win) {
            win.document.write('<img src="' + canvas.toDataURL() + '" style="border:1px solid lime; width:300px; height:300px; image-rendering:pixelated;">');
            win.document.write('<br>' + title);
            win.document.body.style.background = '#000';
            win.document.body.style.color = '#fff';
            win.document.title = title;
        } else {
            alert('Popups blocked. Can\'t show image.');
        }
    };

    // --- AUTHORIZATION CHECK ---
    // Rule: Visible ONLY if:
    // 1. User is Admin (ID: 69069618)
    // 2. OR Environment is Localhost/DevFrame (dev_user_local)
    // 3. OR Environment is Pure Web (not Telegram)
    // TESTED: ID 509656145 should be BLOCKED in Telegram.
    // --- AUTHORIZATION CHECK ---
    const isAuthorized = () => {
        const user = gameState.currentUser;
        const userId = user ? String(user.id) : 'guest';
        const ALLOWED_IDS = ['69069618', 'dev_user_local'];

        // 1. Admins determine their own fate
        if (ALLOWED_IDS.includes(userId)) return true;

        // 2. Allow Localhost and Staging (cipher-squad-web)
        // Production (cipher-squad-ui) is NOT in this list, so it will return false.
        const hostname = window.location.hostname;
        if (hostname.includes('localhost') || hostname.includes('cipher-squad-web')) {
            return true;
        }

        return false;
    };

    return (
        <div style={{ border: '1px dashed red', padding: '10px', background: '#000', color: '#fff', marginBottom: '10px' }}>
            <h4 style={{ marginTop: 0 }}>Debug Controls (Dev Only)</h4>

            {isAuthorized() && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!gameState.isBootcampMode && (
                        <>
                            <button onClick={handleReseed} style={{ cursor: 'pointer', background: '#440000', color: '#f00', border: '1px solid #f00', padding: '5px' }}>
                                ⚠️ RESEED DAILY VAULT
                            </button>
                            <button onClick={handleAutoSolve} style={{ cursor: 'pointer', background: '#330044', color: '#d0f', border: '1px solid #d0f', padding: '5px' }}>
                                🪄 AUTO SOLVE VAULT
                            </button>
                        </>
                    )}
                    <button onClick={() => window.location.reload()} style={{ cursor: 'pointer', background: '#333', color: '#fff', padding: '5px' }}>
                        ↻ RELOAD APP
                    </button>
                    <button onClick={() => {
                        if (confirm('Reset to BOOTCAMP? This will clear local storage.')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }} style={{ cursor: 'pointer', background: '#444400', color: '#ff0', border: '1px solid #ff0', padding: '5px' }}>
                        👶 RESET TO BOOTCAMP
                    </button>
                    {gameState.isBootcampMode && (
                        <button onClick={() => {
                            if (confirm('Skip Bootcamp and go to Daily Vault?')) {
                                localStorage.setItem('bootcamp_complete', 'true');
                                window.location.reload();
                            }
                        }} style={{ cursor: 'pointer', background: '#004444', color: '#0ff', border: '1px solid #0ff', padding: '5px' }}>
                            🎓 SKIP BOOTCAMP
                        </button>
                    )}
                    <button onClick={handleShowMaster} style={{ cursor: 'pointer', background: '#004400', color: '#0f0', border: '1px solid #0f0', padding: '5px' }}>
                        👁 SHOW MASTER IMAGE
                    </button>
                    <button onClick={() => setShowLeaderboard(true)} style={{ cursor: 'pointer', background: '#442200', color: '#fa0', border: '1px solid #fa0', padding: '5px' }}>
                        🏆 LEADERBOARD
                    </button>
                </div>
            )}

            {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
        </div>
    );
};

export default GameControls;

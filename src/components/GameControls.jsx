import React from 'react';
import { gameState } from '../game/state/GameState';
import { TILE_STATUS } from '../game/constants';

const GameControls = () => {

    // Helper to Reset State for Testing
    const handleReseed = async () => {
        if (!confirm('This will wipe the current daily vault and generate a new one. Continue?')) return;

        try {
            await fetch('/api/game/vault/admin/seed', {
                method: 'POST',
                headers: { 'X-Admin-Key': 'dev-key-ignore-for-now' } // Worker checks env var, if not set it might fail or pass depending on logic. 
                // Actually my worker check is: if (key !== env.ADMIN_KEY && env.ADMIN_KEY)
                // So if I don't set ADMIN_KEY env var in dev, any key works.
            });
            window.location.reload();
        } catch (e) {
            alert('Seed Failed: ' + e.message);
        }
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
            const grid = t.data.solutionGrid;

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
                ctx.fillText('?', colChunk * 50 + 20, rowChunk * 50 + 25);
            }
        });

        // Open in new window or modal? Alert for now is too small.
        // Let's create a temporary overlay or just open data URL
        const win = window.open();
        if (win) {
            win.document.write('<img src="' + canvas.toDataURL() + '" style="border:1px solid lime; width:300px; height:300px; image-rendering:pixelated;">');
            win.document.write('<br>Master Image Preview');
            win.document.body.style.background = '#000';
            win.document.body.style.color = '#fff';
        } else {
            alert('Popups blocked. Can\'t show image.');
        }
    };

    return (
        <div style={{ border: '1px dashed red', padding: '10px', background: '#000', color: '#fff', marginBottom: '10px' }}>
            <h4 style={{ marginTop: 0 }}>Debug Controls (Dev Only)</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={handleReseed} style={{ cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #f00', padding: '5px' }}>
                    ♻ FORCE RESEED
                </button>
                <button onClick={() => window.location.reload()} style={{ cursor: 'pointer', background: '#333', color: '#fff', padding: '5px' }}>
                    ↻ RELOAD APP
                </button>
                <button onClick={handleShowMaster} style={{ cursor: 'pointer', background: '#004400', color: '#0f0', border: '1px solid #0f0', padding: '5px' }}>
                    👁 SHOW MASTER IMAGE
                </button>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                *Reseed will generate new 15x15 Space Invader Pattern.
            </div>
        </div>
    );
};

export default GameControls;

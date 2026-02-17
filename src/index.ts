// STUDIO-NATIVE: Standard Entry Point

// CONFIG
const API_PREFIX = '/api/game/vault';

// --- AUTHENTICATION LAYER ---

async function validateTelegramWebAppData(initData: string, botToken: string): Promise<boolean> {
    if (!initData || !botToken) return false;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');

    // Sort keys alphabetically
    const sortedParams = Array.from(urlParams.entries())
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n');

    // HMAC-SHA256 Signature Verification
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

    const signatureKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const isValid = await crypto.subtle.verify(
        'HMAC',
        signatureKey,
        hexToBuf(hash),
        encoder.encode(sortedParams)
    );

    return isValid;
}

function hexToBuf(hex: string): ArrayBuffer {
    const view = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return view.buffer;
}

function extractUserFromInitData(initData: string): any {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    return userStr ? JSON.parse(userStr) : null;
}

// --- DATA ACCESS LAYER ---
class VaultRepository {
    constructor(private db: any) { }

    async getVault(dayId: string) {
        const { results } = await this.db.prepare('SELECT * FROM tiles WHERE vault_id = ?').bind(dayId).all();
        // Return structured object matching frontend expectation
        return {
            date: dayId,
            grid: results.map((r: any) => ({
                id: r.id,
                status: r.status,
                claimedBy: r.claimed_by,
                lockExpiry: r.lock_expiry,
                data: JSON.parse(r.data || '{}')
            }))
        };
    }

    async getTile(tileId: string) {
        return this.db.prepare('SELECT * FROM tiles WHERE id = ?').bind(tileId).first();
    }

    async getActiveLockForUser(userId: string) {
        const now = Date.now();
        // Only return lock if it is NOT expired
        return this.db.prepare('SELECT * FROM tiles WHERE status = "CLAIMED" AND claimed_by = ? AND lock_expiry > ?').bind(userId, now).first();
    }

    async claimTile(tileId: string, userId: string) {
        // Atomic Transaction for Claim Safety
        const stmt = this.db.prepare(`
            UPDATE tiles 
            SET status = 'CLAIMED', claimed_by = ?, lock_expiry = ? 
            WHERE id = ? AND status = 'OPEN' 
            RETURNING *
        `).bind(userId, Date.now() + 300000, tileId);

        const result = await stmt.first();
        return result;
    }

    async releaseTile(tileId: string, userId: string) {
        // Only release if owned by user
        return this.db.prepare(`
            UPDATE tiles 
            SET status = 'OPEN', claimed_by = NULL, lock_expiry = NULL 
            WHERE id = ? AND claimed_by = ?
        `).bind(tileId, userId).run();
    }

    async solveTile(tileId: string, userId: string) {
        return this.db.prepare(`
            UPDATE tiles 
            SET status = 'SOLVED', claimed_by = NULL, lock_expiry = NULL, completed_by = ?, completed_at = ? 
            WHERE id = ? AND claimed_by = ? AND status = 'CLAIMED'
            RETURNING *
        `).bind(userId, Date.now(), tileId, userId).first();
    }

    // Ops
    async ensureVault(dayId: string) {
        await this.db.prepare('INSERT OR IGNORE INTO vaults (active_date, status, created_at) VALUES (?, "OPEN", ?)').bind(dayId, Date.now()).run();
    }

    async seedTiles(dayId: string, tiles: any[]) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO tiles (id, vault_id, status, data, solution) VALUES (?, ?, ?, ?, ?)');
        const batch = tiles.map(t => stmt.bind(t.id, dayId, 'OPEN', JSON.stringify(t.data), JSON.stringify(t.solution)));
        await this.db.batch(batch);
    }
    async getLeaderboard(dayId: string) {
        const query = `
            SELECT completed_by, COUNT(*) as score
            FROM tiles
            WHERE vault_id = ? AND status = 'SOLVED'
            GROUP BY completed_by
            ORDER BY score DESC
            LIMIT 50
        `;
        const { results } = await this.db.prepare(query).bind(dayId).all();
        return results.map((r: any) => ({
            userId: r.completed_by,
            score: r.score
        }));
    }



    async wipeVault(dayId: string) {
        await this.db.prepare('DELETE FROM tiles WHERE vault_id = ?').bind(dayId).run();
    }
}

// --- CONTROLLER ---

async function handleGameRequest(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const authHeader = request.headers.get('Authorization');

    // 1. Authenticate (Skip for Public GET Vault?) 
    // For V1, let's require auth generally, or allow anonymous read.
    // Let's allow anonymous read for now to show the grid even if not logged in.
    let userId = null;

    if (authHeader && authHeader.startsWith('tma ')) {
        const initData = authHeader.substring(4);
        const isValid = await validateTelegramWebAppData(initData, env.TELEGRAM_BOT_TOKEN);
        if (isValid) {
            const user = extractUserFromInitData(initData);
            if (user) userId = String(user.id);
        }
    } else if (authHeader && authHeader.startsWith('mock ')) {
        // DEV AUTH: Allow mock users for browser testing
        const mockId = authHeader.substring(5);
        if (mockId) userId = mockId;
        console.log('[Auth] Using Mock User:', userId);
    }

    const repo = new VaultRepository(env.cipher_squad_db);
    const isPost = request.method === 'POST';
    const isGet = request.method === 'GET';

    // 2. Route

    // Admin Ops (Protected by Admin Key, bypasses User Auth)
    if (isPost && path === `${API_PREFIX}/admin/seed`) {
        // HARDCODED DEV OVERRIDE for V1 Soft Launch
        const key = request.headers.get('X-Admin-Key');
        if (key === 'dev-key-ignore-for-now') return handleSeed(request, env);

        // Fallback to Env Check
        if (env.ADMIN_KEY && key === env.ADMIN_KEY) return handleSeed(request, env);

        return new Response(`Unauthorized Admin. Received Key: '${key}'`, { status: 401 });
    }

    if (isGet && path === `${API_PREFIX}`) {
        const today = new Date().toISOString().split('T')[0];
        let vault = await repo.getVault(today);
        const debugInfo: any = { initial_count: vault.grid.length };

        // Lazy Seed: Ensure data exists for today
        if (!vault.grid || vault.grid.length === 0) {
            console.log('[LazySeed] Vault empty, seeding now...');
            await seedTodayVault(env);
            vault = await repo.getVault(today);
            debugInfo.seeded = true;
            debugInfo.post_seed_count = vault.grid.length;
        }

        const response = Response.json({ ...vault, _debug: debugInfo });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        response.headers.set('X-Worker-Version', 'v2.2-debug');
        return response;
    }

    if (!userId) return new Response('Unauthorized', { status: 401 });

    if (isPost && path === `${API_PREFIX}/claim`) {
        if (!userId) return new Response('Unauthorized', { status: 401 });
        return handleClaim(request, repo, userId);
    }
    if (isPost && path === `${API_PREFIX}/release`) {
        if (!userId) return new Response('Unauthorized', { status: 401 });
        return handleRelease(request, repo, userId);
    }
    if (isPost && path === `${API_PREFIX}/solve`) {
        if (!userId) return new Response('Unauthorized', { status: 401 });
        return handleSolve(request, repo, userId);
    }

    if (isGet && path === `${API_PREFIX}/leaderboard`) {
        const today = new Date().toISOString().split('T')[0];
        const leaderboard = await repo.getLeaderboard(today);
        return Response.json({ success: true, data: leaderboard });
    }

    return new Response('Not Found', { status: 404 });
}

async function handleClaim(req: Request, repo: VaultRepository, userId: string) {
    const body: any = await req.json();
    const { tileId } = body;
    if (!tileId) return new Response('Missing tileId', { status: 400 });

    const existingLock = await repo.getActiveLockForUser(userId);
    if (existingLock) return new Response('USER_HAS_ACTIVE_LOCK', { status: 429 });

    const tile = await repo.claimTile(tileId, userId);
    if (!tile) return new Response('TILE_NOT_OPEN', { status: 409 });

    return Response.json({ success: true, data: tile });
}

async function handleRelease(req: Request, repo: VaultRepository, userId: string) {
    const body: any = await req.json();
    const { tileId } = body;
    await repo.releaseTile(tileId, userId);
    return Response.json({ success: true });
}

async function handleSolve(req: Request, repo: VaultRepository, userId: string) {
    const body: any = await req.json();
    if (!body.solution) return new Response('Missing solution', { status: 400 });

    const tile = await repo.solveTile(body.tileId, userId);
    if (!tile) return new Response('INVALID_CLAIM_OR_OWNER', { status: 403 });

    return Response.json({ success: true, data: { reward: 'SHARD_FOUND' } });
}

async function handleSeed(req: Request, env: any) {
    const repo = new VaultRepository(env.cipher_squad_db);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Wipe clean to prevent ID collisions (e.g. t1 vs 2026-02-07_t1)
    await repo.wipeVault(date);

    // 2. Run standard seeding logic
    await seedTodayVault(env);

    return Response.json({
        success: true,
        message: `Vault for ${date} has been wiped and reseeded with Master Image.`
    });
}

// --- STATS LAYER ---
class StatsRepository {
    constructor(private db: any) { }

    async getDailyStats(dayId: string) {
        // DAU: Count distinct users who touched a tile today (Claimed or Completed)
        // Note: 'claimed_by' is current owner. 'completed_by' is final solver.
        // This is a lower-bound approximation for V1.
        const dauQuery = `
            SELECT COUNT(DISTINCT user_id) as dau FROM (
                SELECT claimed_by as user_id FROM tiles WHERE vault_id = ? AND claimed_by IS NOT NULL
                UNION
                SELECT completed_by as user_id FROM tiles WHERE vault_id = ? AND completed_by IS NOT NULL
            )
        `;
        const dau = await this.db.prepare(dauQuery).bind(dayId, dayId).first('dau');

        const tilesQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'SOLVED' THEN 1 ELSE 0 END) as solved,
                SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed
            FROM tiles WHERE vault_id = ?
        `;
        const tiles = await this.db.prepare(tilesQuery).bind(dayId).first();

        // Vault Completion Time (Mock/Null for V1 if global start time not tracked precisely)
        return {
            date: dayId,
            daily_active_users: dau || 0,
            tiles_solved: tiles.solved || 0,
            tiles_claimed: tiles.claimed || 0,
            vault_completion_time: null
        };
    }
}

async function reportStatsToStudio(env: any) {
    const today = new Date().toISOString().split('T')[0];
    const statsRepo = new StatsRepository(env.cipher_squad_db);
    const stats = await statsRepo.getDailyStats(today);

    // Fail-silent
    try {
        if (env.STUDIO_CORE_URL && env.STUDIO_STATS_KEY) {
            await fetch(`${env.STUDIO_CORE_URL}/api/stats/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Studio-Stats-Key': env.STUDIO_STATS_KEY
                },
                body: JSON.stringify({
                    game_id: 'cipher-squad',
                    timestamp: new Date().toISOString(),
                    metrics: stats
                })
            });
            console.log('[Stats] Reported to Studio Core');
        } else {
            console.log('[Stats] Skipped: Missing Env Config', stats);
        }
    } catch (e) {
        console.error('[Stats] Failed to report', e);
    }
}

// --- HELPERS ---

async function seedTodayVault(env: any) {
    const repo = new VaultRepository(env.cipher_squad_db);
    const date = new Date().toISOString().split('T')[0];

    // Idempotent Seeding
    await repo.ensureVault(date);

    // 1. Generate Master Image (15x15)
    // Simple "Space Invader" Pattern or similar symmetry
    const masterImage = Array(15).fill(0).map(() => Array(15).fill(0));

    // Draw a procedural "Space Invader" (Vertical Symmetry)
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c <= 7; c++) {
            let isPixel = 0;
            const rand = Math.random();

            // Anatomy Heuristics
            if (r < 3) {
                // Antennae (Sparse)
                if (rand > 0.8) isPixel = 1;
            } else if (r < 11) {
                // Body (Dense)
                // Center column almost always solid in body
                if (c === 7) isPixel = rand > 0.1 ? 1 : 0;
                else isPixel = rand > 0.3 ? 1 : 0;
            } else {
                // Legs (Medium, distinct)
                if (rand > 0.5) isPixel = 1;
            }

            // Apply to Left Side
            masterImage[r][c] = isPixel;

            // Mirror to Right Side
            if (c < 7) {
                masterImage[r][14 - c] = isPixel;
            }
        }
    }

    // 2. Slice into 3x3 Grid of 5x5 Tiles
    const tiles = [];
    let tileIndex = 1;

    for (let rowChunk = 0; rowChunk < 3; rowChunk++) {
        for (let colChunk = 0; colChunk < 3; colChunk++) {
            const uniqueId = `${date}_t${tileIndex}`;

            // Extract 5x5 Slice
            const slice = Array(5).fill(0).map((_, r) =>
                Array(5).fill(0).map((_, c) =>
                    masterImage[rowChunk * 5 + r][colChunk * 5 + c]
                )
            );

            // Create Tile Data (Include solution for Debug/V1)
            tiles.push({
                id: uniqueId,
                data: {
                    clue: `Sector ${rowChunk},${colChunk}`,
                    solutionGrid: slice // EXPOSED FOR FRONTEND CLUE GEN & DEBUG
                },
                solution: { solutionGrid: slice } // Secure Copy (unused by frontend for now)
            });

            tileIndex++;
        }
    }

    await repo.seedTiles(date, tiles);
    console.log(`[Scheduled] Seeded vault for ${date} with Master Image`);
}

export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        // ... (existing fetch logic) ...
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (url.pathname.startsWith('/api/game')) {
            try {
                const response = await handleGameRequest(request, env);
                // Append CORS to response
                const newHeaders = new Headers(response.headers);
                Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders
                });
            } catch (e: any) {
                console.error('[Worker Error]', e);
                return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        return new Response('Hello from Cipher Squad (Studio Native)', { status: 200, headers: corsHeaders });
    },
    async scheduled(event: any, env: any, ctx: any) {
        ctx.waitUntil(Promise.all([
            seedTodayVault(env),
            reportStatsToStudio(env)
        ]));
    }
};

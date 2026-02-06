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
        const stmt = this.db.prepare('INSERT OR IGNORE INTO tiles (id, vault_id, status, data, solution) VALUES (?, ?, ?, ?, ?)');
        const batch = tiles.map(t => stmt.bind(t.id, dayId, 'OPEN', JSON.stringify(t.data), JSON.stringify(t.solution)));
        await this.db.batch(batch);
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
    }

    const repo = new VaultRepository(env.cipher_squad_db);
    const isPost = request.method === 'POST';
    const isGet = request.method === 'GET';

    // 2. Route
    if (isGet && path === `${API_PREFIX}`) {
        const today = new Date().toISOString().split('T')[0];
        const vault = await repo.getVault(today);
        return Response.json(vault); // Public Read
    }

    if (!userId) return new Response('Unauthorized', { status: 401 });

    if (isPost && path === `${API_PREFIX}/claim`) return handleClaim(request, repo, userId);
    if (isPost && path === `${API_PREFIX}/release`) return handleRelease(request, repo, userId);
    if (isPost && path === `${API_PREFIX}/solve`) return handleSolve(request, repo, userId);

    // Admin Ops
    if (isPost && path === `${API_PREFIX}/admin/seed`) {
        // Simple protection: Check for Admin Key or just allow for Soft Launch (it's idempotent)
        const key = request.headers.get('X-Admin-Key');
        if (key !== env.ADMIN_KEY && env.ADMIN_KEY) return new Response('Unauthorized Admin', { status: 401 });
        return handleSeed(request, env);
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

    // 1. Create Vault
    await repo.ensureVault(date);

    // 2. Generate Mock Data (3x3)
    const tiles = [];
    for (let i = 1; i <= 9; i++) {
        tiles.push({
            id: `t${i}`,
            data: { clue: `Clue for tile ${i}` },
            solution: { val: i } // Simple numeric match for V1
        });
    }

    // 3. Seed
    await repo.seedTiles(date, tiles);

    return Response.json({
        success: true,
        message: `Seeded vault for ${date} with ${tiles.length} tiles`
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

    const tiles = [];
    for (let i = 1; i <= 9; i++) {
        tiles.push({
            id: `t${i}`,
            data: { clue: `Daily Clue ${i}` },
            solution: { val: i }
        });
    }
    await repo.seedTiles(date, tiles);
    console.log(`[Scheduled] Seeded vault for ${date}`);
}

export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
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
    async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
        ctx.waitUntil(Promise.all([
            seedTodayVault(env),
            reportStatsToStudio(env)
        ]));
    }
};

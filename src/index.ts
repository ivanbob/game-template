// STUDIO-NATIVE: Standard Entry Point

const API_PREFIX = '/api/game/vault';
const SQUAD_PREFIX = '/api/squad';
const GLOBAL_SQUAD_ID = 'global-squad-0000';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, X-Squad-Id',
};

// --- AUTHENTICATION LAYER ---
async function validateTelegramWebAppData(initData: string, botToken: string): Promise<boolean> {
    if (!initData || !botToken) return false;
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;
    urlParams.delete('hash');
    const sortedParams = Array.from(urlParams.entries()).map(([key, value]) => `${key}=${value}`).sort().join('\n');
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey('raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));
    const signatureKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const isValid = await crypto.subtle.verify('HMAC', signatureKey, hexToBuf(hash), encoder.encode(sortedParams));
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
class SquadRepository {
    constructor(private db: any) { }

    async getSquad(squadId: string) {
        return this.db.prepare('SELECT * FROM squads WHERE id = ?').bind(squadId).first();
    }

    async createSquad(userId: string, name: string) {
        const squadId = crypto.randomUUID();
        const now = Date.now();
        await this.db.batch([
            this.db.prepare('INSERT INTO squads (id, name, created_at, created_by) VALUES (?, ?, ?, ?)').bind(squadId, name, now, userId),
            this.db.prepare('INSERT INTO squad_members (squad_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(squadId, userId, 'admin', now)
        ]);
        return { id: squadId, name };
    }

    async joinSquad(userId: string, squadId: string) {
        const squad = await this.getSquad(squadId);
        if (!squad) return null;
        await this.db.prepare('INSERT OR IGNORE INTO squad_members (squad_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(squadId, userId, 'member', Date.now()).run();
        return squad;
    }

    async getUserSquads(userId: string) {
        const { results } = await this.db.prepare(`
            SELECT s.id, s.name, sm.role 
            FROM squads s 
            JOIN squad_members sm ON s.id = sm.squad_id 
            WHERE sm.user_id = ?
        `).bind(userId).all();
        return results;
    }

    async ensureGlobalSquad() {
        await this.db.prepare('INSERT OR IGNORE INTO squads (id, name, created_at, created_by) VALUES (?, ?, ?, ?)').bind(GLOBAL_SQUAD_ID, 'Global Squad', Date.now(), 'system').run();
    }
}

class VaultRepository {
    constructor(private db: any) { }

    async getVaultId(squadId: string, dayId: string) {
        const res = await this.db.prepare('SELECT id, grid_size FROM vaults_v2 WHERE squad_id = ? AND active_date = ?').bind(squadId, dayId).first();
        return res;
    }

    async getVault(squadId: string, dayId: string) {
        const vaultInfo = await this.getVaultId(squadId, dayId);
        if (!vaultInfo) return null;

        const { results } = await this.db.prepare('SELECT * FROM tiles_v2 WHERE vault_id = ?').bind(vaultInfo.id).all();
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

    async getActiveLockForUser(userId: string) {
        const now = Date.now();
        return this.db.prepare('SELECT * FROM tiles_v2 WHERE status = "CLAIMED" AND claimed_by = ? AND lock_expiry > ?').bind(userId, now).first();
    }

    async claimTile(tileId: string, userId: string, squadId: string) {
        const stmt = this.db.prepare(`
            UPDATE tiles_v2 
            SET status = 'CLAIMED', claimed_by = ?, lock_expiry = ? 
            WHERE id = ? AND status = 'OPEN' 
            AND vault_id IN (SELECT id FROM vaults_v2 WHERE squad_id = ?)
            RETURNING *
        `).bind(userId, Date.now() + 300000, tileId, squadId);
        return await stmt.first();
    }

    async releaseTile(tileId: string, userId: string) {
        return this.db.prepare(`
            UPDATE tiles_v2 
            SET status = 'OPEN', claimed_by = NULL, lock_expiry = NULL 
            WHERE id = ? AND claimed_by = ?
        `).bind(tileId, userId).run();
    }

    async solveTile(tileId: string, userId: string, squadId: string) {
        const res = await this.db.prepare(`
            UPDATE tiles_v2 
            SET status = 'SOLVED', claimed_by = NULL, lock_expiry = NULL, completed_by = ?, completed_at = ? 
            WHERE id = ? AND claimed_by = ? AND status = 'CLAIMED'
            AND vault_id IN (SELECT id FROM vaults_v2 WHERE squad_id = ?)
            RETURNING *
        `).bind(userId, Date.now(), tileId, userId, squadId).first();

        // Update user stats
        if (res) {
            await this.db.prepare(`
                INSERT INTO user_stats (user_id, total_solves, last_active) 
                VALUES (?, 1, ?) 
                ON CONFLICT(user_id) DO UPDATE SET total_solves = total_solves + 1, last_active = excluded.last_active
            `).bind(userId, Date.now()).run();
        }

        return res;
    }

    async ensureVault(squadId: string, dayId: string) {
        let vault = await this.getVaultId(squadId, dayId);
        if (vault) return { ...vault, was_created: false };

        // Determine grid size based on squad members
        let gridSize = 80; // Default Large
        if (squadId !== GLOBAL_SQUAD_ID) {
            const memCountRes = await this.db.prepare('SELECT COUNT(*) as count FROM squad_members WHERE squad_id = ?').bind(squadId).first();
            const count = memCountRes?.count || 0;
            if (count <= 2) gridSize = 12;
            else if (count <= 9) gridSize = 20;
            else if (count <= 25) gridSize = 35;
            else if (count <= 50) gridSize = 50;
            else gridSize = 80;
        }

        const vaultId = crypto.randomUUID();
        await this.db.prepare('INSERT INTO vaults_v2 (id, squad_id, active_date, grid_size, status, created_at) VALUES (?, ?, ?, ?, "OPEN", ?)').bind(vaultId, squadId, dayId, gridSize, Date.now()).run();

        return { id: vaultId, grid_size: gridSize, was_created: true };
    }

    async seedTiles(vaultId: string, tiles: any[]) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO tiles_v2 (id, vault_id, x, y, status, data, solution) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const batch = tiles.map(t => stmt.bind(t.id, vaultId, t.x, t.y, 'OPEN', JSON.stringify(t.data), JSON.stringify(t.solution)));
        await this.db.batch(batch);
    }

    async getLeaderboard(squadId: string, dayId: string) {
        const query = `
            SELECT t.completed_by, COUNT(*) as score
            FROM tiles_v2 t
            JOIN vaults_v2 v ON t.vault_id = v.id
            WHERE v.squad_id = ? AND v.active_date = ? AND t.status = 'SOLVED'
            GROUP BY t.completed_by
            ORDER BY score DESC
            LIMIT 50
        `;
        const { results } = await this.db.prepare(query).bind(squadId, dayId).all();
        return results.map((r: any) => ({
            userId: r.completed_by,
            score: r.score
        }));
    }

    async wipeVault(squadId: string, dayId: string) {
        const vault = await this.getVaultId(squadId, dayId);
        if (vault) {
            await this.db.prepare('DELETE FROM tiles_v2 WHERE vault_id = ?').bind(vault.id).run();
            await this.db.prepare('DELETE FROM vaults_v2 WHERE id = ?').bind(vault.id).run();
        }
    }
}

// --- CONTROLLER ---

async function handleGameRequest(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const authHeader = request.headers.get('Authorization');
    const squadHeader = request.headers.get('X-Squad-Id');
    let squadId = squadHeader || GLOBAL_SQUAD_ID;

    let userId = null;
    let username = null;

    if (authHeader && authHeader.startsWith('tma ')) {
        const initData = authHeader.substring(4);
        const isValid = await validateTelegramWebAppData(initData, env.TELEGRAM_BOT_TOKEN);
        if (isValid) {
            const user = extractUserFromInitData(initData);
            if (user) {
                userId = String(user.id);
                username = user.username;
            }
        }
    } else if (authHeader && authHeader.startsWith('mock ')) {
        const mockId = authHeader.substring(5);
        if (mockId) userId = mockId;
    }

    const repo = new VaultRepository(env.cipher_squad_db);
    const squadRepo = new SquadRepository(env.cipher_squad_db);
    const isPost = request.method === 'POST';
    const isGet = request.method === 'GET';

    await squadRepo.ensureGlobalSquad();

    // Verify squad membership if not global
    if (userId && squadId !== GLOBAL_SQUAD_ID) {
        // Just checking if squad exists, if strict we would enforce membership here
        // For now, if the user requested a squad, allow it if it exists.
    }

    // --- SQUAD API (NEW) ---
    if (path.startsWith(SQUAD_PREFIX)) {
        if (!userId) return new Response('Unauthorized', { status: 401 });

        if (isPost && path === `${SQUAD_PREFIX}/create`) {
            const body: any = await request.json();
            if (!body.name) return new Response('Missing name', { status: 400 });
            const result = await squadRepo.createSquad(userId, body.name);
            return Response.json({ success: true, data: result });
        }

        if (isPost && path === `${SQUAD_PREFIX}/join`) {
            const body: any = await request.json();
            if (!body.squadId) return new Response('Missing squadId', { status: 400 });
            const result = await squadRepo.joinSquad(userId, body.squadId);
            if (!result) return new Response('Squad not found or invalid invite code', { status: 400 });
            return Response.json({ success: true, data: result });
        }

        if (isGet && path === `${SQUAD_PREFIX}/info`) {
            const squads = await squadRepo.getUserSquads(userId);
            return Response.json({ success: true, data: { squads } });
        }
    }

    // Admin Ops
    if (isPost && path === `${API_PREFIX}/admin/seed`) {
        const key = request.headers.get('X-Admin-Key');
        if (key !== 'dev-key-ignore-for-now' && key !== env.ADMIN_KEY) {
            return new Response(`Unauthorized Admin. Received Key: '${key}'`, { status: 401 });
        }
        return handleSeed(request, env, squadId);
    }

    if (isGet && path === `${API_PREFIX}`) {
        const today = new Date().toISOString().split('T')[0];
        let vault = await repo.getVault(squadId, today);
        const debugInfo: any = { initial_count: vault?.grid?.length || 0 };

        if (!vault || !vault.grid || vault.grid.length === 0) {
            await seedTodayVault(env, squadId, today);
            vault = await repo.getVault(squadId, today);
            debugInfo.seeded = true;
            debugInfo.post_seed_count = vault?.grid?.length || 0;
        }

        const response = Response.json({ ...vault, _debug: debugInfo });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
    }

    if (!userId) return new Response('Unauthorized', { status: 401 });

    if (isPost && path === `${API_PREFIX}/claim`) {
        return handleClaim(request, repo, userId, squadId);
    }
    if (isPost && path === `${API_PREFIX}/release`) {
        return handleRelease(request, repo, userId);
    }
    if (isPost && path === `${API_PREFIX}/solve`) {
        return handleSolve(request, repo, userId, squadId);
    }

    if (isGet && path === `${API_PREFIX}/leaderboard`) {
        const today = new Date().toISOString().split('T')[0];
        const leaderboard = await repo.getLeaderboard(squadId, today);
        return new Response(JSON.stringify({ success: true, data: leaderboard }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' }
        });
    }

    return new Response('Not Found', { status: 404 });
}

async function handleClaim(req: Request, repo: VaultRepository, userId: string, squadId: string) {
    const body: any = await req.json();
    const { tileId } = body;
    if (!tileId) return new Response('Missing tileId', { status: 400 });

    const existingLock = await repo.getActiveLockForUser(userId);
    if (existingLock) return new Response('USER_HAS_ACTIVE_LOCK', { status: 429 });

    const tile = await repo.claimTile(tileId, userId, squadId);
    if (!tile) return new Response('TILE_NOT_OPEN_OR_INVALID_SQUAD', { status: 409 });

    return Response.json({ success: true, data: tile });
}

async function handleRelease(req: Request, repo: VaultRepository, userId: string) {
    const body: any = await req.json();
    const { tileId } = body;
    await repo.releaseTile(tileId, userId);
    return Response.json({ success: true });
}

async function handleSolve(req: Request, repo: VaultRepository, userId: string, squadId: string) {
    const body: any = await req.json();
    if (!body.solution) return new Response('Missing solution', { status: 400 });

    const tile = await repo.solveTile(body.tileId, userId, squadId);
    if (!tile) return new Response('INVALID_CLAIM_OR_OWNER', { status: 403 });

    return Response.json({ success: true, data: { reward: 'SHARD_FOUND' } });
}

async function handleSeed(req: Request, env: any, squadId: string) {
    const repo = new VaultRepository(env.cipher_squad_db);
    const date = new Date().toISOString().split('T')[0];
    await repo.wipeVault(squadId, date);
    await seedTodayVault(env, squadId, date);
    return Response.json({ success: true, message: `Vault for ${date} in squad ${squadId} wiped and reseeded.` });
}

// --- STATS LAYER ---
class StatsRepository {
    constructor(private db: any) { }

    async getDailyStats(squadId: string, dayId: string) {
        const dauQuery = `
            SELECT COUNT(DISTINCT user_id) as dau FROM (
                SELECT t.claimed_by as user_id FROM tiles_v2 t JOIN vaults_v2 v ON t.vault_id = v.id WHERE v.squad_id = ? AND v.active_date = ? AND t.claimed_by IS NOT NULL
                UNION
                SELECT t.completed_by as user_id FROM tiles_v2 t JOIN vaults_v2 v ON t.vault_id = v.id WHERE v.squad_id = ? AND v.active_date = ? AND t.completed_by IS NOT NULL
            )
        `;
        const dau = await this.db.prepare(dauQuery).bind(squadId, dayId, squadId, dayId).first('dau');

        const tilesQuery = `
            SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'SOLVED' THEN 1 ELSE 0 END) as solved, SUM(CASE WHEN t.status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed
            FROM tiles_v2 t JOIN vaults_v2 v ON t.vault_id = v.id WHERE v.squad_id = ? AND v.active_date = ?
        `;
        const tiles = await this.db.prepare(tilesQuery).bind(squadId, dayId).first();

        return {
            date: dayId,
            squad_id: squadId,
            daily_active_users: dau || 0,
            tiles_solved: tiles?.solved || 0,
            tiles_claimed: tiles?.claimed || 0,
            vault_completion_time: null
        };
    }
}

async function reportStatsToStudio(env: any) {
    const today = new Date().toISOString().split('T')[0];
    const statsRepo = new StatsRepository(env.cipher_squad_db);
    const stats = await statsRepo.getDailyStats(GLOBAL_SQUAD_ID, today);

    try {
        if (env.STUDIO_CORE_URL && env.STUDIO_STATS_KEY) {
            await fetch(`${env.STUDIO_CORE_URL}/api/stats/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Studio-Stats-Key': env.STUDIO_STATS_KEY },
                body: JSON.stringify({ game_id: 'cipher-squad', timestamp: new Date().toISOString(), metrics: stats })
            });
        }
    } catch (e) {
        console.error('[Stats] Failed to report', e);
    }
}

// --- HELPERS ---

async function seedTodayVault(env: any, squadId: string, date: string) {
    const repo = new VaultRepository(env.cipher_squad_db);
    const vaultInfo = await repo.ensureVault(squadId, date);
    if (!vaultInfo.was_created) return;

    // Use gridSize to determine puzzle scale. For V1 MVP, if gridSize is 12 it's 3x4 tiles (3x3 blocks).
    // The previous implementation used 15x15 pixel master image, sliced into 3x3 tiles of 5x5 pixels each.
    // We will keep the 3x3 grid (9 tiles total) for simplicity, regardless of size, 
    // BUT we will map it nicely for now, to avoid breaking frontend logic that expects 9 tiles.
    // In a full implementation, `gridSize` would determine the number of tiles.

    const masterImage = Array(15).fill(0).map(() => Array(15).fill(0));
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c <= 7; c++) {
            let isPixel = 0;
            const rand = Math.random();
            if (r < 3) { if (rand > 0.8) isPixel = 1; }
            else if (r < 11) { if (c === 7) isPixel = Math.random() > 0.1 ? 1 : 0; else isPixel = rand > 0.3 ? 1 : 0; }
            else { if (rand > 0.5) isPixel = 1; }
            masterImage[r][c] = isPixel;
            if (c < 7) masterImage[r][14 - c] = isPixel;
        }
    }

    const tiles = [];
    let tileIndex = 1;
    for (let rowChunk = 0; rowChunk < 3; rowChunk++) {
        for (let colChunk = 0; colChunk < 3; colChunk++) {
            const uniqueId = `${vaultInfo.id}_t${tileIndex}`;
            const slice = Array(5).fill(0).map((_, r) => Array(5).fill(0).map((_, c) => masterImage[rowChunk * 5 + r][colChunk * 5 + c]));

            tiles.push({
                id: uniqueId,
                x: colChunk,
                y: rowChunk,
                data: { clue: `Sector ${rowChunk},${colChunk}`, solutionGrid: slice },
                solution: { solutionGrid: slice }
            });
            tileIndex++;
        }
    }

    await repo.seedTiles(vaultInfo.id, tiles);
    console.log(`[LazySeed] Seeded vault for ${date} in ${squadId}`);
}

// --- TELEGRAM BOT LOGIC ---

async function handleTelegramWebhook(request: Request, env: any) {
    try {
        const update: any = await request.json();
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const firstName = update.message.from.first_name || 'Agent';
            const text = update.message.text;

            // Check for invite start_param (e.g., /start join_xxx)
            let startParamMsg = "";
            let startParam = text.split(' ')[1];
            if (text.startsWith('/start') && startParam) {
                startParamMsg = `Detected invite code: ${startParam}\n`;
                // Since bot can't modify db directly without user auth initData, 
                // we rely on the Mini App to actually execute the join using window.Telegram.WebApp.initDataUnsafe.start_param
                startParamMsg += `Open the app to complete joining the squad!\n\n`;
            }

            if (text.startsWith('/start')) {
                await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId,
                    `👋 <b>Welcome, ${firstName}!</b>\n\n` +
                    startParamMsg +
                    `You have been recruited for <b>Cipher Squad</b>.\n\n` +
                    `🔎 <b>Mission:</b> Recover the daily Master Image.\n` +
                    `🤝 <b>Collaborate:</b> Work with others to crack the 15x15 vault.\n` +
                    `🏆 <b>Compete:</b> Earn your spot on the leaderboard.\n\n` +
                    `<i>Tap below to access the secure terminal.</i>`,
                    { inline_keyboard: [[{ text: "🔓 ACCESS VAULT", web_app: { url: "https://cipher-squad-ui.pages.dev/" } }]] }
                );
            }
        }
        return new Response('OK', { status: 200 });
    } catch (e) {
        console.error('[Webhook Error]', e);
        return new Response('Error', { status: 500 });
    }
}

async function sendTelegramMessage(token: string, chatId: number, text: string, replyMarkup: any = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = { chat_id: chatId, text: text, parse_mode: 'HTML' };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
        if (request.method === 'POST' && url.pathname === '/api/telegram/webhook') return handleTelegramWebhook(request, env);
        if (url.pathname.startsWith('/api')) {
            try {
                const response = await handleGameRequest(request, env);
                const newHeaders = new Headers(response.headers);
                Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
                return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
            } catch (e: any) {
                console.error('[Worker Error]', e);
                return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
            }
        }
        return new Response('Hello from Cipher Squad V2 Backend', { status: 200, headers: corsHeaders });
    },
    async scheduled(event: any, env: any, ctx: any) {
        // In V2, most seeding is lazy. We just report stats in the cron.
        ctx.waitUntil(Promise.all([
            reportStatsToStudio(env)
        ]));
    }
};

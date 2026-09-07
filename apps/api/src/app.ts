import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import { COOLDOWN_MS, rarityRates, createPartnerSchema, interactSchema, renameSchema, type Partner, type PartnerEvent } from '../../../packages/shared/src/index.js';
import { generateInteraction, generatePartner } from './generator.js';
import { openDatabase, type DatabaseClient } from './database.js';

export async function createApp(databasePath?: string) {
  const db = await openDatabase(databasePath);
  const app = new Hono<{ Variables: { owner: string } }>();
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
      const origin = c.req.header('origin');
      const forwardedHost = c.req.header('x-forwarded-host');
      const forwardedProtocol = c.req.header('x-forwarded-proto') || 'https';
      const expected = process.env.PUBLIC_ORIGIN
        || (forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : undefined)
        || (process.env.NODE_ENV === 'production' ? new URL(c.req.url).origin : 'http://127.0.0.1:5173');
      if (origin && origin !== expected) return c.json({ error: '请求来源不匹配' }, 403);
      if (Number(c.req.header('content-length') || 0) > 8192) return c.json({ error: '请求内容过大' }, 413);
    }
    if (c.req.path === '/api/stats' || c.req.path === '/api/health') return next();
    let owner = getCookie(c, 'partner_session');
    if (!owner || !(await db.execute({ sql: 'SELECT id FROM sessions WHERE id = ?', args: [owner] })).rows.length) {
      owner = randomUUID();
      await db.execute({ sql: 'INSERT INTO sessions (id) VALUES (?)', args: [owner] });
      setCookie(c, 'partner_session', owner, { httpOnly: true, sameSite: 'Lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
    }
    c.set('owner', owner);
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof SyntaxError) return c.json({ error: '请求内容不是有效的 JSON' }, 400);
    console.error(error);
    return c.json({ error: '心动信号暂时中断，请稍后再试' }, 500);
  });
  const read = async (connection: DatabaseClient, id: string, owner: string): Promise<Partner | null> => {
    const { rows } = await connection.execute({ sql: 'SELECT data FROM partners WHERE id = ? AND owner = ?', args: [id, owner] });
    return rows[0] ? JSON.parse(String(rows[0].data)) : null;
  };
  const update = (connection: DatabaseClient, partner: Partner) => connection.execute({ sql: 'UPDATE partners SET data = ? WHERE id = ?', args: [JSON.stringify(partner), partner.id] });
  app.get('/api/health', c => c.json({ status: 'ok' }));
  app.get('/api/stats', async c => {
    const { rows } = await db.execute('SELECT rarity, count FROM generation_counts');
    const rarities = rarityRates.map(rate => ({ ...rate, count: Number(rows.find(row => row.rarity === rate.rarity)?.count || 0) }));
    return c.json({ total: rarities.reduce((sum, item) => sum + item.count, 0), rarities, updatedAt: new Date().toISOString() });
  });
  app.get('/api/partners', async c => {
    const { rows } = await db.execute({ sql: 'SELECT data FROM partners WHERE owner = ? ORDER BY rowid DESC', args: [c.get('owner')] });
    return c.json({ partners: rows.map(row => JSON.parse(String(row.data)) as Partner).filter(p => p.saved) });
  });
  app.post('/api/partners', async c => {
    const parsed = createPartnerSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message || '参数有误' }, 400);
    const owner = c.get('owner');
    const { rows } = await db.execute({ sql: 'SELECT last_generated FROM sessions WHERE id = ?', args: [owner] });
    if (Date.now() - Number(rows[0]!.last_generated) < 1000) return c.json({ error: '正在补充灵感，请稍等一秒' }, 429);
    const partner = generatePartner(parsed.data);
    // A batch is atomic on local SQLite and Turso's HTTP transport.
    await db.batch([
      { sql: "DELETE FROM events WHERE partner_id IN (SELECT id FROM partners WHERE owner = ? AND json_extract(data, '$.saved') = 0)", args: [owner] },
      { sql: "DELETE FROM partners WHERE owner = ? AND json_extract(data, '$.saved') = 0", args: [owner] },
      { sql: 'INSERT INTO partners (id, owner, data) VALUES (?, ?, ?)', args: [partner.id, owner, JSON.stringify(partner)] },
      { sql: 'UPDATE generation_counts SET count = count + 1 WHERE rarity = ?', args: [partner.rarity] },
      { sql: 'UPDATE sessions SET last_generated = ? WHERE id = ?', args: [Date.now(), owner] },
    ], 'write');
    return c.json({ partner }, 201);
  });
  app.post('/api/partners/:id/save', async c => {
    const partner = await read(db, c.req.param('id'), c.get('owner'));
    if (!partner) return c.json({ error: '这个对象已离开当前会话，请重新生成' }, 404);
    partner.saved = true; await update(db, partner);
    return c.json({ partner });
  });
  app.patch('/api/partners/:id', async c => {
    const parsed = renameSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: '名字需要 1–12 个字符' }, 400);
    const partner = await read(db, c.req.param('id'), c.get('owner'));
    if (!partner) return c.json({ error: '找不到这个对象' }, 404);
    partner.name = parsed.data.name; await update(db, partner);
    return c.json({ partner });
  });
  app.delete('/api/partners/:id', async c => {
    const partner = await read(db, c.req.param('id'), c.get('owner'));
    if (!partner) return c.json({ error: '找不到这个对象' }, 404);
    await db.batch([
      { sql: 'DELETE FROM events WHERE partner_id = ?', args: [partner.id] },
      { sql: 'DELETE FROM partners WHERE id = ?', args: [partner.id] },
    ], 'write');
    return c.json({ ok: true });
  });
  app.get('/api/partners/:id/events', async c => {
    if (!await read(db, c.req.param('id'), c.get('owner'))) return c.json({ error: '找不到这个对象' }, 404);
    const { rows } = await db.execute({ sql: 'SELECT data FROM events WHERE partner_id = ? ORDER BY created_at DESC LIMIT 30', args: [c.req.param('id')] });
    const events = rows.map(row => JSON.parse(String(row.data)) as PartnerEvent);
    return c.json({ events, nextAllowedAt: events[0] ? new Date(Date.parse(events[0].createdAt) + COOLDOWN_MS).toISOString() : null });
  });
  app.post('/api/partners/:id/interactions', async c => {
    const parsed = interactSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: '不支持的互动类型' }, 400);
    const partner = await read(db, c.req.param('id'), c.get('owner'));
    if (!partner || !partner.saved) return c.json({ error: '请先收藏这个对象' }, 404);
    const { rows } = await db.execute({ sql: 'SELECT created_at FROM events WHERE partner_id = ? ORDER BY created_at DESC LIMIT 1', args: [partner.id] });
    const now = Date.now();
    if (rows[0] && now - Number(rows[0].created_at) < COOLDOWN_MS) return c.json({ error: 'TA 正在回味刚才的互动', nextAllowedAt: new Date(Number(rows[0].created_at) + COOLDOWN_MS).toISOString() }, 429);
    const generated = generateInteraction(parsed.data.action, partner.name);
    const delta = Math.min(generated.delta, 100 - partner.affection);
    const event: PartnerEvent = { id: randomUUID(), partnerId: partner.id, action: parsed.data.action, message: generated.message, delta, createdAt: new Date(now).toISOString() };
    partner.affection += delta;
    await db.batch([
      { sql: 'UPDATE partners SET data = ? WHERE id = ?', args: [JSON.stringify(partner), partner.id] },
      { sql: 'INSERT INTO events (id, partner_id, created_at, data) VALUES (?, ?, ?, ?)', args: [event.id, partner.id, now, JSON.stringify(event)] },
    ], 'write');
    return c.json({ partner, event, nextAllowedAt: new Date(now + COOLDOWN_MS).toISOString() });
  });
  app.notFound(c => c.json({ error: '接口不存在' }, 404));
  return { app, db };
}

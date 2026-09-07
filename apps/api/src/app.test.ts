import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

test('generation, ownership, persistence, interactions and cascading deletion', async () => {
  const { app, db } = await createApp(':memory:');
  try {
    const response = await app.request('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: '小零', personality: '温柔治愈', kind: '好搭子' }) });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const { partner } = await response.json();
    assert.equal(partner.name, '小零');
    assert.equal(partner.personality, '温柔治愈');
    const firstStats = await (await app.request('/api/stats')).json();
    assert.equal(firstStats.total, 1);
    assert.equal(firstStats.rarities.reduce((sum: number, item: { count: number }) => sum + item.count, 0), 1);
    assert.deepEqual(firstStats.rarities.map((item: { probability: number }) => item.probability), [8, 27, 65]);
    const request = (path: string, method = 'GET', body?: unknown) => app.request(path, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assert.equal((await (await request('/api/partners')).json()).partners.length, 0);
    assert.equal((await app.request(`/api/partners/${partner.id}/save`, { method: 'POST' })).status, 404);
    assert.equal((await request(`/api/partners/${partner.id}/save`, 'POST')).status, 200);
    assert.equal((await (await request('/api/partners')).json()).partners.length, 1);
    assert.equal((await request(`/api/partners/${partner.id}`, 'PATCH', { name: '' })).status, 400);
    const renamed = await (await request(`/api/partners/${partner.id}`, 'PATCH', { name: '新名字' })).json();
    assert.equal(renamed.partner.name, '新名字');
    const interaction = await request(`/api/partners/${partner.id}/interactions`, 'POST', { action: 'date' });
    assert.equal(interaction.status, 200);
    assert.equal((await interaction.json()).partner.affection, 8);
    assert.equal((await request(`/api/partners/${partner.id}/interactions`, 'POST', { action: 'gift' })).status, 429);
    assert.equal((await (await request(`/api/partners/${partner.id}/events`)).json()).events.length, 1);
    assert.equal((await request(`/api/partners/${partner.id}`, 'DELETE')).status, 200);
    assert.equal((await (await request('/api/partners')).json()).partners.length, 0);
    assert.equal(Number((await db.execute('SELECT COUNT(*) AS count FROM events')).rows[0]!.count), 0);
    assert.equal((await (await app.request('/api/stats')).json()).total, 1);
  } finally { db.close(); }
});

test('rejects malformed data, unknown actions and cross-origin writes', async () => {
  const { app, db } = await createApp(':memory:');
  try {
    assert.equal((await app.request('/api/partners', { method: 'POST', body: '{' })).status, 400);
    assert.equal((await app.request('/api/partners', { method: 'POST', body: JSON.stringify({ nickname: 'x'.repeat(13) }) })).status, 400);
    assert.equal((await app.request('/api/partners', { method: 'POST', headers: { origin: 'https://unrelated.example' }, body: '{}' })).status, 403);
    assert.equal((await app.request('/api/partners', { method: 'POST', headers: { origin: 'http://127.0.0.1:5173' }, body: '{}' })).status, 201);
    assert.equal((await app.request('https://internal-deployment.vercel.app/api/partners', { method: 'POST', headers: { origin: 'https://new-partner-api.vercel.app', 'x-forwarded-host': 'new-partner-api.vercel.app', 'x-forwarded-proto': 'https' }, body: '{}' })).status, 201);
    assert.equal((await app.request('/api/partners/anything/interactions', { method: 'POST', body: JSON.stringify({ action: 'hack' }) })).status, 400);
  } finally { db.close(); }
});

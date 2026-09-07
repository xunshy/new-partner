import type { Client, Transaction } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type DatabaseClient = Client;
export type DatabaseTransaction = Transaction;

export async function openDatabase(path?: string): Promise<DatabaseClient> {
  const remote = !path && process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL && !remote) throw new Error('TURSO_DATABASE_URL is required on Vercel');
  if (remote && !remote.startsWith('libsql://') && !remote.startsWith('https://')) throw new Error('Use a persistent remote Turso URL');
  const local = path || process.env.DATABASE_PATH || './data/partners.db';
  if (!remote && local !== ':memory:') mkdirSync(dirname(resolve(local)), { recursive: true });
  // 远程库只走 HTTP，用 web 入口避开 libsql 的原生二进制——Serverless 打包经常带不上它。
  const { createClient } = remote ? await import('@libsql/client/web') : await import('@libsql/client');
  const db = createClient({ url: remote || (local === ':memory:' ? 'file::memory:' : pathToFileURL(resolve(local)).href), ...(remote ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}) });
  await db.batch([
    'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, last_generated INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS partners (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS partners_owner ON partners(owner)',
    'CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, data TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS events_partner ON events(partner_id, created_at DESC)',
    "CREATE TABLE IF NOT EXISTS generation_counts (rarity TEXT PRIMARY KEY CHECK(rarity IN ('SSR','SR','R')), count INTEGER NOT NULL DEFAULT 0)",
    ...['SSR', 'SR', 'R'].map(rarity => ({ sql: "INSERT OR IGNORE INTO generation_counts (rarity, count) SELECT ?, COUNT(*) FROM partners WHERE json_extract(data, '$.rarity') = ?", args: [rarity, rarity] })),
  ], 'write');
  return db;
}

export async function write<T>(db: DatabaseClient, operation: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
  const tx = await db.transaction('write');
  try { const result = await operation(tx); await tx.commit(); return result; }
  catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

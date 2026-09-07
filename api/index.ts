import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from '@hono/node-server/vercel';
import { createApp } from '../apps/api/src/app.js';

let cachedHandler: ((req: IncomingMessage, res: ServerResponse) => void) | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    if (!cachedHandler) {
      const { app } = await createApp();
      cachedHandler = handle(app);
    }
    return cachedHandler(request, response);
  } catch (error) {
    console.error('API bootstrap failed', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      error: '服务初始化失败',
      detail: error instanceof Error ? error.message : String(error),
    }));
  }
}

import { handle } from '@hono/node-server/vercel';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app.js';

let instance: ReturnType<typeof createApp> | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  instance ||= createApp();
  const { app } = await instance;
  return handle(app)(request, response);
}

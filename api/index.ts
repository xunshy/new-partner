import { handle } from '@hono/node-server/vercel';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app.js';

let instance: ReturnType<typeof createApp> | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  let app;
  try {
    // 初始化失败时不要把 rejected promise 留在缓存里，否则整个热容器后续请求全挂。
    instance ||= createApp();
    ({ app } = await instance);
  } catch (error) {
    instance = undefined;
    // app 还没建起来，Hono 的 onError 兜不住，这里手动回一个 JSON，
    // 否则 Vercel 只会返回一段纯文本错误页，前端解析不了、也看不出原因。
    console.error('Failed to initialise API', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ error: '服务初始化失败', detail: error instanceof Error ? error.message : String(error) }));
    return;
  }
  return handle(app)(request, response);
}

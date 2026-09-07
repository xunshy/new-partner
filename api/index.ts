import type { IncomingMessage, ServerResponse } from 'node:http';

// 这个文件顶层不能有任何运行时 import：模块加载阶段崩溃是捕获不到的，
// 平台只会返回一段纯文本错误页，看不出原因。全部改成 bootstrap 里的动态 import。
async function bootstrap() {
  const { handle } = await import('@hono/node-server/vercel');
  const { createApp } = await import('../apps/api/src/app.js');
  const { app } = await createApp();
  return handle(app);
}

let ready: ReturnType<typeof bootstrap> | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  let respond;
  try {
    // 失败时清掉缓存，否则热容器会一直复用这个 rejected promise。
    ready ||= bootstrap();
    respond = await ready;
  } catch (error) {
    ready = undefined;
    console.error('API bootstrap failed', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({
      error: '服务初始化失败',
      detail: error instanceof Error ? error.message : String(error),
      code: (error as NodeJS.ErrnoException)?.code ?? null,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8) : null,
      runtime: { node: process.version, hasDatabaseUrl: Boolean(process.env.TURSO_DATABASE_URL), hasAuthToken: Boolean(process.env.TURSO_AUTH_TOKEN) },
    }, null, 2));
    return;
  }
  return respond(request, response);
}

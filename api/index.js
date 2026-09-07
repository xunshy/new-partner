let cachedHandler;

module.exports = async function handler(request, response) {
  try {
    if (!cachedHandler) {
      const { handle } = require('@hono/node-server/vercel');
      const appModule = await import('../apps/api/dist/app.js');
      const { createApp } = appModule;
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
};

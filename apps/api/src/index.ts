import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const { app, db } = await createApp();
const server = serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000), hostname: '127.0.0.1' }, info => console.log(`API ready at http://127.0.0.1:${info.port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

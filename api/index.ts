import { handle } from '@hono/node-server/vercel';
import { createApp } from '../apps/api/src/app.js';

const { app } = await createApp();
export default handle(app);

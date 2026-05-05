import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Backend running on http://localhost:${info.port}`);
});

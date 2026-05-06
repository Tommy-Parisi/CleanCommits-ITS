import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import sessionRouter from './routes/session';
import studentRouter from './routes/student';

const app = new Hono();

app.use('/api/*', cors({ origin: 'http://localhost:5173' }));
app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/session', sessionRouter);
app.route('/api/student', studentRouter);

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Backend running on http://localhost:${info.port}`);
});

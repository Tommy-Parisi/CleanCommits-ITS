import { Hono } from 'hono';
import { getKCStates } from '../db';
import { toSnapshot } from '../snapshots';

const router = new Hono();

// GET /api/student/:id/state
router.get('/:id/state', (c) => {
  const kcStates = getKCStates(c.req.param('id'));
  if (kcStates.length === 0) {
    return c.json({ detail: 'Student not found' }, 404);
  }
  return c.json({ kcStates: kcStates.map(toSnapshot) });
});

export default router;

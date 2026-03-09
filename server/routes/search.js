import { Router } from 'express';
import { universalSearch } from '../services/universalSearch.js';

const router = Router();

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.max(1, Math.min(20, Number(req.query.limit || 8)));
  const providers = String(req.query.providers || 'spotify,apple,deezer,youtube')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  try {
    const tracks = await universalSearch(q, providers, limit);
    return res.json({
      query: q,
      count: tracks.length,
      tracks,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Universal search failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

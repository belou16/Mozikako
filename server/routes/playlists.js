import { Router } from 'express';
import { createJob, getJob } from '../services/jobsStore.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    playlists: [],
    message: 'Playlist sync endpoints scaffolded for future implementation.',
  });
});

router.post('/import', (req, res) => {
  const { sourceProvider } = req.body || {};
  const job = createJob('import', { sourceProvider: sourceProvider || null });
  res.json(job);
});

router.post('/export', (req, res) => {
  const { targetProvider } = req.body || {};
  const job = createJob('export', { targetProvider: targetProvider || null });
  res.json(job);
});

router.post('/transfer', (req, res) => {
  const { fromProvider, toProvider } = req.body || {};
  const job = createJob('transfer', {
    fromProvider: fromProvider || null,
    toProvider: toProvider || null,
  });
  res.json(job);
});

router.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  return res.json(job);
});

export default router;

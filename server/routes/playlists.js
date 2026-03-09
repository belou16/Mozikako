import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    playlists: [],
    message: 'Playlist sync endpoints scaffolded for future implementation.',
  });
});

router.post('/import', (req, res) => {
  const { sourceProvider } = req.body || {};
  res.json({
    jobId: `job_import_${Date.now()}`,
    sourceProvider: sourceProvider || null,
    status: 'queued',
  });
});

router.post('/export', (req, res) => {
  const { targetProvider } = req.body || {};
  res.json({
    jobId: `job_export_${Date.now()}`,
    targetProvider: targetProvider || null,
    status: 'queued',
  });
});

router.post('/transfer', (req, res) => {
  const { fromProvider, toProvider } = req.body || {};
  res.json({
    jobId: `job_transfer_${Date.now()}`,
    fromProvider: fromProvider || null,
    toProvider: toProvider || null,
    status: 'queued',
  });
});

router.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.json({
    jobId,
    status: 'queued',
    progress: 0,
    message: 'Job engine is scaffolded. Connect BullMQ or Cloud Tasks for real execution.',
  });
});

export default router;

import { Router } from 'express';

const router = Router();

const providers = ['spotify', 'deezer', 'youtube', 'apple'];

router.get('/providers/status', (_req, res) => {
  // Placeholder response for MVP. Real implementation should check DB tokens.
  res.json({
    providers: providers.map((provider) => ({
      provider,
      connected: false,
    })),
  });
});

router.get('/:provider/connect', (req, res) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  // In production, build provider-specific OAuth URL and redirect.
  return res.json({
    provider,
    message: 'OAuth connect endpoint ready. Configure provider credentials to enable redirects.',
  });
});

router.get('/:provider/callback', (req, res) => {
  const { provider } = req.params;
  const { code } = req.query;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing OAuth code' });
  }

  return res.json({
    provider,
    connected: true,
    message: 'Callback received. Exchange and persist tokens in a secure store.',
  });
});

router.post('/:provider/refresh', (req, res) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  return res.json({ provider, refreshed: true });
});

router.delete('/:provider/disconnect', (req, res) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  return res.json({ provider, disconnected: true });
});

export default router;

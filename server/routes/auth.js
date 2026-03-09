import { Router } from 'express';
import { buildAuthUrl, exchangeCodeForToken, refreshToken } from '../services/oauthProviders.js';
import {
  clearConnection,
  getConnection,
  listConnectionStatus,
  setConnection,
} from '../services/tokenStore.js';

const router = Router();

const providers = ['spotify', 'deezer', 'youtube', 'apple'];

router.get('/providers/status', (_req, res) => {
  listConnectionStatus(providers)
    .then((status) => res.json({ providers: status }))
    .catch((error) => {
      res.status(500).json({ error: 'Cannot read connection status', details: String(error) });
    });
});

router.get('/:provider/connect', (req, res) => {
  const { provider } = req.params;
  const state = String(req.query.state || 'mozikako_state');
  const shouldRedirect = String(req.query.redirect || '0') === '1';

  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  const authUrl = buildAuthUrl(provider, state);
  if (!authUrl) {
    return res.status(501).json({
      provider,
      supported: false,
      message: `Provider ${provider} OAuth flow is not enabled yet.`,
    });
  }

  if (shouldRedirect) {
    return res.redirect(authUrl);
  }

  return res.json({ provider, supported: true, authUrl });
});

router.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const { code } = req.query;
  const mode = String(req.query.mode || 'redirect');
  const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }
  if (!code) {
    if (mode === 'redirect') {
      return res.redirect(`${webOrigin}/?oauth=error&reason=${encodeURIComponent('Missing OAuth code')}`);
    }
    return res.status(400).json({ error: 'Missing OAuth code' });
  }

  try {
    const tokenSet = await exchangeCodeForToken(provider, String(code));
    const saved = await setConnection(provider, tokenSet);

    if (mode === 'redirect') {
      return res.redirect(`${webOrigin}/?oauth=success&provider=${encodeURIComponent(provider)}`);
    }

    return res.json({
      provider,
      connected: true,
      expiresIn: saved.expiresIn || null,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    if (mode === 'redirect') {
      const reason = error instanceof Error ? error.message : String(error);
      return res.redirect(`${webOrigin}/?oauth=error&reason=${encodeURIComponent(reason)}`);
    }
    return res.status(500).json({
      provider,
      connected: false,
      error: 'OAuth callback failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/:provider/refresh', async (req, res) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  try {
    const current = await getConnection(provider);
    const refreshed = await refreshToken(provider, current?.refreshToken || null);

    if (!refreshed.supported) {
      return res.status(400).json({ provider, refreshed: false, message: 'Refresh is not supported' });
    }

    const saved = await setConnection(provider, refreshed);
    return res.json({
      provider,
      refreshed: true,
      updatedAt: saved.updatedAt,
      expiresIn: saved.expiresIn || null,
    });
  } catch (error) {
    return res.status(500).json({
      provider,
      refreshed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.delete('/:provider/disconnect', async (req, res) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  await clearConnection(provider);
  return res.json({ provider, disconnected: true });
});

export default router;

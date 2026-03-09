const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const DEEZER_AUTH_ENDPOINT = 'https://connect.deezer.com/oauth/auth.php';
const DEEZER_TOKEN_ENDPOINT = 'https://connect.deezer.com/oauth/access_token.php';

function spotifyScope() {
  return (
    process.env.SPOTIFY_SCOPES ||
    'user-read-email user-read-private playlist-read-private playlist-modify-public playlist-modify-private'
  );
}

export function buildAuthUrl(provider, state = 'mozikako_state') {
  if (provider === 'spotify') {
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID || '',
      response_type: 'code',
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
      scope: spotifyScope(),
      state,
      show_dialog: 'true',
    });
    return `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
  }

  if (provider === 'deezer') {
    const params = new URLSearchParams({
      app_id: process.env.DEEZER_APP_ID || '',
      redirect_uri: process.env.DEEZER_REDIRECT_URI || '',
      perms: 'basic_access,email,offline_access,manage_library,delete_library',
      state,
    });
    return `${DEEZER_AUTH_ENDPOINT}?${params.toString()}`;
  }

  return null;
}

export async function exchangeCodeForToken(provider, code) {
  if (provider === 'spotify') {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID || ''}:${process.env.SPOTIFY_CLIENT_SECRET || ''}`,
    ).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
    });

    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify token exchange failed: ${text}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  if (provider === 'deezer') {
    const url = new URL(DEEZER_TOKEN_ENDPOINT);
    url.searchParams.set('app_id', process.env.DEEZER_APP_ID || '');
    url.searchParams.set('secret', process.env.DEEZER_APP_SECRET || '');
    url.searchParams.set('code', code);
    url.searchParams.set('output', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Deezer token exchange failed: ${text}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Deezer token exchange failed: ${data.error.message || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: null,
      expiresIn: data.expires,
      tokenType: 'Bearer',
      scope: 'basic_access,email,offline_access,manage_library,delete_library',
    };
  }

  throw new Error(`Provider ${provider} does not support code exchange yet.`);
}

export async function refreshToken(provider, currentRefreshToken) {
  if (provider !== 'spotify') {
    return { supported: false };
  }

  if (!currentRefreshToken) {
    throw new Error('Missing Spotify refresh token.');
  }

  const basicAuth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID || ''}:${process.env.SPOTIFY_CLIENT_SECRET || ''}`,
  ).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token refresh failed: ${text}`);
  }

  const data = await response.json();
  return {
    supported: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || currentRefreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

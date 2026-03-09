const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function universalSearch(query, providers = ['spotify', 'apple', 'deezer', 'youtube']) {
  const url = new URL(`${API_BASE}/api/v1/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('providers', providers.join(','));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Search request failed');
  }

  return response.json();
}

export async function fetchProviderStatus() {
  const response = await fetch(`${API_BASE}/api/v1/auth/providers/status`);
  if (!response.ok) throw new Error('Cannot fetch provider status');
  return response.json();
}

export async function getProviderConnectLink(provider) {
  const response = await fetch(`${API_BASE}/api/v1/auth/${provider}/connect`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || 'Cannot initialize OAuth flow');
  }
  return response.json();
}

export async function disconnectProvider(provider) {
  const response = await fetch(`${API_BASE}/api/v1/auth/${provider}/disconnect`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Cannot disconnect provider');
  return response.json();
}

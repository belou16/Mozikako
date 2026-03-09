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

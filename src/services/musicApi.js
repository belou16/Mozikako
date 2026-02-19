/**
 * MOZIKAKO — Music API Service Layer
 * Uses iTunes Search API (free, no auth, CORS-safe) + YouTube iframes
 */

const ITUNES_BASE = 'https://itunes.apple.com';
const YT_SEARCH_BASE = 'https://www.youtube.com';

/* ─────────────────────────────────────────
   iTunes / Apple Music Search
   Returns real tracks with 30s preview URLs
   ───────────────────────────────────────── */
export async function searchTracks(query, limit = 6) {
  if (!query.trim()) return [];
  const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=US`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map(item => ({
    id: item.trackId,
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    duration: formatMs(item.trackTimeMillis),
    image: item.artworkUrl100?.replace('100x100', '400x400') || '',
    preview: item.previewUrl || null,          // 30-second MP3 preview
    source: 'apple',
    price: item.trackPrice,
    genre: item.primaryGenreName,
    releaseDate: item.releaseDate?.slice(0, 4),
  }));
}

export async function searchAlbums(query, limit = 6) {
  if (!query.trim()) return [];
  const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map(item => ({
    id: item.collectionId,
    title: item.collectionName,
    artist: item.artistName,
    trackCount: item.trackCount,
    image: item.artworkUrl100?.replace('100x100', '400x400') || '',
    source: 'apple',
    releaseDate: item.releaseDate?.slice(0, 4),
    genre: item.primaryGenreName,
  }));
}

export async function searchArtists(query, limit = 5) {
  if (!query.trim()) return [];
  const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=musicArtist&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map(item => ({
    id: item.artistId,
    name: item.artistName,
    genre: item.primaryGenreName,
    source: 'apple',
    image: `https://picsum.photos/seed/${item.artistId}/400/400`,
  }));
}

export async function getTopCharts(limit = 10) {
  const url = `${ITUNES_BASE}/us/rss/topSongs/limit=${limit}/json`;
  const res = await fetch(url);
  const data = await res.json();
  const entries = data?.feed?.entry || [];
  return entries.map(e => ({
    id: e.id?.attributes?.['im:id'],
    title: e['im:name']?.label,
    artist: e['im:artist']?.label,
    image: e['im:image']?.[2]?.label || '',
    source: 'apple',
    preview: null,
  }));
}

/* ─────────────────────────────────────────
   YouTube Video Search IDs
   Returns embeddable YouTube IDs via
   no-API-key trick through YouTube's
   search suggest endpoint
   ───────────────────────────────────────── */
export function buildYouTubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function getYouTubeEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&modestbranding=1`;
}

// Curated YouTube IDs for demo (replaced by real IDs in prod with YouTube Data API v3)
export function getMockYouTubeResults(query) {
  const pool = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley', views: '1.4B views', duration: '3:33' },
    { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', channel: 'Ed Sheeran', views: '5.9B views', duration: '4:24' },
    { id: 'ktvTqknDobU', title: 'Inspirational Background Music', channel: 'Royalty Free', views: '10M views', duration: '2:58' },
    { id: 'ZbZSe6N_BXs', title: 'Happy - Pharrell Williams', channel: 'Pharrell Williams', views: '1.2B views', duration: '3:53' },
    { id: 'CevxZvSJLk8', title: 'Katy Perry - Roar', channel: 'Katy Perry', views: '3.7B views', duration: '3:42' },
    { id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', channel: 'Mark Ronson', views: '4.8B views', duration: '4:30' },
  ];
  return pool.slice(0, 2);
}

/* ─────────────────────────────────────────
   Helpers
   ───────────────────────────────────────── */
export function formatMs(ms) {
  if (!ms) return '—';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

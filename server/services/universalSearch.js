const ITUNES_BASE = 'https://itunes.apple.com';
const DEEZER_BASE = 'https://api.deezer.com';

function normalizeTrack(track) {
  return `${track.title}::${track.artist}`.toLowerCase().trim();
}

function mergeResults(tracks) {
  const byKey = new Map();

  for (const item of tracks) {
    const key = normalizeTrack(item);
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: key,
        title: item.title,
        artist: item.artist,
        album: item.album || null,
        coverUrl: item.coverUrl || null,
        sources: [item.source],
      });
      continue;
    }

    const current = byKey.get(key);
    const hasProvider = current.sources.some((s) => s.provider === item.source.provider);
    if (!hasProvider) {
      current.sources.push(item.source);
    }
  }

  return [...byKey.values()];
}

async function searchApple(query, limit) {
  const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((item) => ({
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    coverUrl: item.artworkUrl100?.replace('100x100', '400x400') || null,
    source: {
      provider: 'apple',
      providerTrackId: String(item.trackId),
      previewUrl: item.previewUrl || null,
      externalUrl: item.trackViewUrl || null,
      playable: Boolean(item.previewUrl),
    },
  }));
}

async function searchDeezer(query, limit) {
  try {
    const url = `${DEEZER_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.data || []).map((item) => ({
      title: item.title,
      artist: item.artist?.name || 'Unknown',
      album: item.album?.title || null,
      coverUrl: item.album?.cover_medium || null,
      source: {
        provider: 'deezer',
        providerTrackId: String(item.id),
        previewUrl: item.preview || null,
        externalUrl: item.link || null,
        playable: Boolean(item.preview),
      },
    }));
  } catch {
    return [];
  }
}

function searchYouTubeStub(query) {
  return [
    {
      title: `${query} (Official Audio)`,
      artist: 'YouTube Music',
      album: null,
      coverUrl: null,
      source: {
        provider: 'youtube',
        providerTrackId: 'dQw4w9WgXcQ',
        previewUrl: null,
        externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        playable: true,
      },
    },
  ];
}

function searchSpotifyStub(query) {
  return [
    {
      title: query,
      artist: 'Spotify Catalog',
      album: null,
      coverUrl: null,
      source: {
        provider: 'spotify',
        providerTrackId: `spotify_stub_${query.toLowerCase().replace(/\s+/g, '_')}`,
        previewUrl: null,
        externalUrl: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
        playable: true,
      },
    },
  ];
}

export async function universalSearch(query, providers = ['apple', 'deezer', 'youtube'], limit = 8) {
  const wanted = new Set(providers);
  const tasks = [];

  if (wanted.has('spotify')) tasks.push(Promise.resolve(searchSpotifyStub(query)));
  if (wanted.has('apple')) tasks.push(searchApple(query, limit));
  if (wanted.has('deezer')) tasks.push(searchDeezer(query, limit));
  if (wanted.has('youtube')) tasks.push(Promise.resolve(searchYouTubeStub(query)));

  const settled = await Promise.allSettled(tasks);
  const aggregated = settled
    .filter((item) => item.status === 'fulfilled')
    .flatMap((item) => item.value);

  return mergeResults(aggregated);
}

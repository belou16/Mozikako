import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CircleUserRound,
  Disc3,
  Headphones,
  Home,
  LayoutGrid,
  Library,
  ListMusic,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  disconnectProvider,
  fetchProviderStatus,
  getProviderConnectLink,
  universalSearch,
} from './services/musicApi';
import './App.css';

const providerOrder = ['spotify', 'apple', 'deezer', 'youtube'];

const providerMeta = {
  spotify: { label: 'Spotify', badge: 'SP', colorClass: 'spotify' },
  apple: { label: 'Apple Music', badge: 'AM', colorClass: 'apple' },
  deezer: { label: 'Deezer', badge: 'DZ', colorClass: 'deezer' },
  youtube: { label: 'YouTube Music', badge: 'YT', colorClass: 'youtube' },
};

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Player', icon: Disc3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const recentPlays = [
  {
    id: 'r1',
    title: 'Ethereal Drift',
    artist: 'SOMA Records',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
    provider: 'spotify',
  },
  {
    id: 'r2',
    title: 'Late Night Sessions',
    artist: 'Cercle Live',
    image: 'https://images.unsplash.com/photo-1571266028243-3e8f37d6bd2d?auto=format&fit=crop&w=900&q=80',
    provider: 'youtube',
  },
  {
    id: 'r3',
    title: 'Acoustic Mornings',
    artist: 'Luna Strings',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
    provider: 'apple',
  },
  {
    id: 'r4',
    title: 'Dark Techno Mix',
    artist: 'Hor Berlin',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    provider: 'deezer',
  },
];

const starterMixes = [
  { id: 'm1', name: 'Deep Focus', subtitle: '42 tracks - Spotify', token: 'D', gradient: 'from-blue' },
  { id: 'm2', name: 'Running High', subtitle: '18 tracks - YouTube', token: 'R', gradient: 'from-pink' },
  { id: 'm3', name: 'Weekend Chill', subtitle: '65 tracks - Multi-platform', token: 'W', gradient: 'from-green' },
  { id: 'm4', name: 'Jazz Essentials', subtitle: '24 tracks - Apple Music', token: 'J', gradient: 'from-orange' },
  { id: 'm5', name: 'Lofi Coding', subtitle: '110 tracks - YouTube', token: 'L', gradient: 'from-cyan' },
];

function ProviderPill({ provider }) {
  const meta = providerMeta[provider] || { label: provider, badge: provider.slice(0, 2).toUpperCase() };
  return <span className={`provider-pill ${meta.colorClass || ''}`}>{meta.label}</span>;
}

function App() {
  const [activeView, setActiveView] = useState('home');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [providerStatus, setProviderStatus] = useState({});
  const [isConnecting, setIsConnecting] = useState('');
  const [searchProviders, setSearchProviders] = useState({
    spotify: true,
    apple: true,
    deezer: true,
    youtube: true,
  });
  const [mixes, setMixes] = useState(starterMixes);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Neon Horizons',
    artist: 'Luminary Collective',
    coverUrl:
      'https://images.unsplash.com/photo-1614149162883-504ce4d13909?auto=format&fit=crop&w=900&q=80',
    sourceProvider: 'spotify',
  });

  const selectedProviders = useMemo(
    () => providerOrder.filter((provider) => searchProviders[provider]),
    [searchProviders],
  );

  const bestMatch = results[0] || null;

  useEffect(() => {
    let mounted = true;
    fetchProviderStatus()
      .then((payload) => {
        if (!mounted) return;
        const nextStatus = {};
        for (const item of payload.providers || []) {
          nextStatus[item.provider] = item.connected;
        }
        setProviderStatus(nextStatus);
      })
      .catch(() => {
        if (!mounted) return;
        setProviderStatus({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  const runSearch = async (term) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setError('Enter a track, artist, or playlist.');
      setResults([]);
      return;
    }

    if (!selectedProviders.length) {
      setError('Enable at least one platform filter before searching.');
      setResults([]);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const payload = await universalSearch(trimmed, selectedProviders);
      const tracks = payload.tracks || [];
      setResults(tracks);
      if (tracks[0]) {
        setCurrentTrack({
          title: tracks[0].title,
          artist: tracks[0].artist,
          coverUrl:
            tracks[0].coverUrl ||
            'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
          sourceProvider: tracks[0].sources?.[0]?.provider || 'spotify',
        });
      }
      setActiveView('search');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Search is unavailable right now.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  const toggleSearchProvider = (provider) => {
    setSearchProviders((current) => ({ ...current, [provider]: !current[provider] }));
  };

  const connectProvider = async (provider) => {
    try {
      setIsConnecting(provider);
      const data = await getProviderConnectLink(provider);
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      setError(data.message || 'OAuth is not available for this provider yet.');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to connect provider.');
    } finally {
      setIsConnecting('');
    }
  };

  const disconnectService = async (provider) => {
    try {
      await disconnectProvider(provider);
      setProviderStatus((current) => ({ ...current, [provider]: false }));
    } catch {
      setError('Unable to disconnect provider.');
    }
  };

  const handleQuickPlay = (entry) => {
    setCurrentTrack({
      title: entry.title,
      artist: entry.artist,
      coverUrl: entry.image || entry.coverUrl,
      sourceProvider: entry.provider || entry.sourceProvider || 'spotify',
    });
  };

  const createNewMix = () => {
    const next = {
      id: `mix_${Date.now()}`,
      name: `Custom Mix ${mixes.length + 1}`,
      subtitle: 'Curated from your universal search history',
      token: 'M',
      gradient: 'from-purple',
    };
    setMixes((current) => [next, ...current]);
  };

  const renderHome = () => (
    <section className="view-grid">
      <div className="welcome-card block-card">
        <h1>Welcome back, Alex</h1>
        <p>Discover new sounds based on your listening profile across platforms.</p>
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Recently Played</h2>
          <button type="button" className="ghost-btn">View All</button>
        </div>
        <div className="recent-grid">
          {recentPlays.map((item) => (
            <button key={item.id} type="button" className="recent-card" onClick={() => handleQuickPlay(item)}>
              <img src={item.image} alt={item.title} />
              <strong>{item.title}</strong>
              <span>{item.artist}</span>
              <ProviderPill provider={item.provider} />
            </button>
          ))}
        </div>
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>My Mixes</h2>
          <button type="button" className="primary-btn" onClick={createNewMix}>
            <Plus size={14} /> Create New
          </button>
        </div>
        <div className="mix-grid">
          {mixes.map((mix) => (
            <article key={mix.id} className="mix-card">
              <div className={`mix-token ${mix.gradient}`}>{mix.token}</div>
              <div>
                <strong>{mix.name}</strong>
                <span>{mix.subtitle}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const renderSearch = () => (
    <section className="view-grid">
      <div className="block-card search-hero">
        <h1>Find your music everywhere</h1>
        <form className="search-bar" onSubmit={onSearchSubmit}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs, albums, artists..."
          />
          <button type="submit" disabled={isLoading}>{isLoading ? 'Searching...' : 'Search'}</button>
        </form>

        <div className="filter-row">
          {providerOrder.map((provider) => {
            const active = searchProviders[provider];
            const meta = providerMeta[provider];
            return (
              <button
                key={provider}
                type="button"
                className={`filter-chip ${active ? 'active' : ''}`}
                onClick={() => toggleSearchProvider(provider)}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Best Match</h2>
        </div>
        {bestMatch ? (
          <article className="best-match">
            <img
              src={
                bestMatch.coverUrl ||
                'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80'
              }
              alt={bestMatch.title}
            />
            <div>
              <span className="tiny-tag">song</span>
              <h3>{bestMatch.title}</h3>
              <p>{bestMatch.artist}</p>
              <div className="source-row">
                {(bestMatch.sources || []).map((source) => (
                  <ProviderPill key={`${source.provider}-${source.providerTrackId}`} provider={source.provider} />
                ))}
              </div>
            </div>
            <button type="button" className="play-now" onClick={() => handleQuickPlay({
              title: bestMatch.title,
              artist: bestMatch.artist,
              coverUrl: bestMatch.coverUrl,
              sourceProvider: bestMatch.sources?.[0]?.provider,
            })}>
              Play Now
            </button>
          </article>
        ) : (
          <p className="muted-line">Run a search to get your best cross-platform match.</p>
        )}
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Search Results</h2>
          <span className="muted-line">{results.length} tracks</span>
        </div>
        <div className="results-table">
          <div className="table-head">
            <span>Title / Artist</span>
            <span>Album</span>
            <span>Available On</span>
          </div>
          {results.map((item) => (
            <button
              type="button"
              key={item.id}
              className="table-row"
              onClick={() =>
                handleQuickPlay({
                  title: item.title,
                  artist: item.artist,
                  coverUrl: item.coverUrl,
                  sourceProvider: item.sources?.[0]?.provider,
                })
              }
            >
              <span className="title-col">
                <strong>{item.title}</strong>
                <small>{item.artist}</small>
              </span>
              <span>{item.album || 'Single'}</span>
              <span className="provider-stack">
                {(item.sources || []).slice(0, 3).map((source) => (
                  <span key={`${item.id}-${source.provider}`} className={`tiny-provider ${providerMeta[source.provider]?.colorClass || ''}`}>
                    {providerMeta[source.provider]?.badge || source.provider.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  const upNext = results.length ? results.slice(1, 5) : recentPlays;

  const renderPlayer = () => (
    <section className="player-layout">
      <article className="player-main block-card">
        <img src={currentTrack.coverUrl} alt={currentTrack.title} className="player-art" />
        <h1>{currentTrack.title}</h1>
        <p>{currentTrack.artist}</p>
        <div className="progress-wrap">
          <div className="progress-line"><span style={{ width: '46%' }} /></div>
          <div className="time-row"><small>01:42</small><small>03:54</small></div>
        </div>
        <div className="player-controls">
          <button type="button">&#10226;</button>
          <button type="button">&#9198;</button>
          <button type="button" className="play-circle"><Play size={22} fill="currentColor" /></button>
          <button type="button">&#9197;</button>
          <button type="button">&#10227;</button>
        </div>
        <div className="playing-source">
          Playing from <strong>{providerMeta[currentTrack.sourceProvider]?.label || 'Universal Source'}</strong>
        </div>
      </article>

      <aside className="queue-panel block-card">
        <div className="section-head">
          <h2>Up Next</h2>
          <ListMusic size={16} />
        </div>
        <div className="queue-list">
          {upNext.map((item) => (
            <button
              type="button"
              key={item.id || item.title}
              className="queue-item"
              onClick={() =>
                handleQuickPlay({
                  title: item.title,
                  artist: item.artist,
                  coverUrl: item.coverUrl || item.image,
                  sourceProvider: item.sources?.[0]?.provider || item.provider,
                })
              }
            >
              <img
                src={
                  item.coverUrl ||
                  item.image ||
                  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80'
                }
                alt={item.title}
              />
              <span>
                <strong>{item.title}</strong>
                <small>{item.artist}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="queue-volume">
          <Volume2 size={16} />
          <div><span style={{ width: '72%' }} /></div>
        </div>
      </aside>
    </section>
  );

  const renderSettings = () => (
    <section className="view-grid">
      <div className="profile-card block-card">
        <img
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80"
          alt="Profile"
        />
        <div>
          <h2>Alex Rivera</h2>
          <p>alex.rivera@mozikako.io</p>
          <span>Premium Member</span>
        </div>
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Connected Services</h2>
          <button type="button" className="ghost-btn">Manage All</button>
        </div>
        <div className="service-grid">
          {providerOrder.map((provider) => {
            const meta = providerMeta[provider];
            const connected = Boolean(providerStatus[provider]);
            return (
              <article key={provider} className="service-card">
                <div>
                  <strong>{meta.label}</strong>
                  <small>{connected ? 'Connected' : 'Not connected'}</small>
                </div>
                {connected ? (
                  <button type="button" onClick={() => disconnectService(provider)}>Disconnect</button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connectProvider(provider)}
                    disabled={isConnecting === provider}
                  >
                    {isConnecting === provider ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Preferences</h2>
        </div>
        <div className="prefs-list">
          <article><strong>Streaming Quality</strong><span>High (320kbps)</span></article>
          <article><strong>Data Saver</strong><span>Disabled</span></article>
          <article><strong>Theme</strong><span>Neon Night</span></article>
        </div>
      </div>
    </section>
  );

  return (
    <div className="mk-shell">
      <aside className="mk-sidebar">
        <div className="brand-box">
          <div className="brand-logo"><Sparkles size={16} /></div>
          <div>
            <strong>Mozikako</strong>
            <span>Universal Audio</span>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={activeView === item.id ? 'active' : ''}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="upgrade-card">
          <strong>Upgrade</strong>
          <p>Enable lossless quality and offline mode.</p>
          <button type="button">Go Pro</button>
        </div>
      </aside>

      <section className="mk-main">
        <header className="topbar">
          <form className="top-search" onSubmit={onSearchSubmit}>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracks, artists or playlists..."
            />
          </form>

          <div className="top-actions">
            <div className="status-pill">
              <span className={providerStatus.spotify ? 'dot connected' : 'dot'} />
              Spotify {providerStatus.spotify ? 'Connected' : 'Offline'}
            </div>
            <button type="button"><Bell size={16} /></button>
            <button type="button"><CircleUserRound size={16} /></button>
          </div>
        </header>

        <main className="content-zone">
          {activeView === 'home' ? renderHome() : null}
          {activeView === 'search' ? renderSearch() : null}
          {activeView === 'library' ? renderPlayer() : null}
          {activeView === 'settings' ? renderSettings() : null}
        </main>

        <footer className="bottom-player">
          <div className="now-track">
            <img src={currentTrack.coverUrl} alt={currentTrack.title} />
            <span>
              <strong>{currentTrack.title}</strong>
              <small>{currentTrack.artist}</small>
            </span>
          </div>
          <div className="transport">
            <button type="button">&#9198;</button>
            <button type="button" className="play-mini"><Pause size={14} fill="currentColor" /></button>
            <button type="button">&#9197;</button>
          </div>
          <div className="volume-mini">
            <Headphones size={14} />
            <div><span style={{ width: '62%' }} /></div>
          </div>
        </footer>
      </section>

      <nav className="mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={activeView === item.id ? 'active' : ''}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;

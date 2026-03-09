import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CircleUserRound,
  Disc3,
  Headphones,
  Home,
  ListMusic,
  LogOut,
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
import { useAudioPlayer } from './hooks/useAudioPlayer';
import './App.css';

const providerOrder = ['spotify', 'apple', 'deezer', 'youtube'];

const providerMeta = {
  spotify: { label: 'Spotify', badge: 'SP', colorClass: 'spotify' },
  apple: { label: 'Apple Music', badge: 'AM', colorClass: 'apple' },
  deezer: { label: 'Deezer', badge: 'DZ', colorClass: 'deezer' },
  youtube: { label: 'YouTube', badge: 'YT', colorClass: 'youtube' },
};

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Player', icon: Disc3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const fallbackRecent = [
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

const defaultMixes = [
  { id: 'm1', name: 'Deep Focus', subtitle: '42 tracks - Spotify', token: 'D', gradient: 'from-blue' },
  { id: 'm2', name: 'Running High', subtitle: '18 tracks - YouTube', token: 'R', gradient: 'from-pink' },
  { id: 'm3', name: 'Weekend Chill', subtitle: '65 tracks - Multi-platform', token: 'W', gradient: 'from-green' },
];

function loadPersisted(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function ProviderPill({ provider }) {
  const meta = providerMeta[provider] || { label: provider };
  return <span className={`provider-pill ${meta.colorClass || ''}`}>{meta.label}</span>;
}

function App() {
  const [activeView, setActiveView] = useState('home');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [providerStatus, setProviderStatus] = useState({});
  const [isConnecting, setIsConnecting] = useState('');
  const [searchProviders, setSearchProviders] = useState({ spotify: true, apple: true, deezer: true, youtube: true });
  const [mixes, setMixes] = useState(() => loadPersisted('mozikako_mixes', defaultMixes));
  const [recentPlays, setRecentPlays] = useState(() => loadPersisted('mozikako_recent', fallbackRecent));
  const [playerFallbackTrack, setPlayerFallbackTrack] = useState(null);
  const [audioQuality, setAudioQuality] = useState(() => localStorage.getItem('mozikako_quality') || 'High (320kbps)');
  const [dataSaver, setDataSaver] = useState(() => localStorage.getItem('mozikako_data_saver') === '1');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mozikako_dark_mode') !== '0');
  const [notificationCount, setNotificationCount] = useState(1);
  const [account, setAccount] = useState(() => loadPersisted('mozikako_account', null));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const player = useAudioPlayer();

  const selectedProviders = useMemo(
    () => providerOrder.filter((provider) => searchProviders[provider]),
    [searchProviders],
  );

  const bestMatch = results[0] || null;
  const connectedProviders = providerOrder.filter((provider) => Boolean(providerStatus[provider]));
  const hasConnectedAccount = connectedProviders.length > 0;

  const refreshProviderStatus = async () => {
    const payload = await fetchProviderStatus();
    const nextStatus = {};
    for (const item of payload.providers || []) {
      nextStatus[item.provider] = item.connected;
    }
    setProviderStatus(nextStatus);
  };

  useEffect(() => {
    refreshProviderStatus().catch(() => setProviderStatus({}));
  }, []);

  useEffect(() => {
    localStorage.setItem('mozikako_mixes', JSON.stringify(mixes));
  }, [mixes]);

  useEffect(() => {
    localStorage.setItem('mozikako_recent', JSON.stringify(recentPlays.slice(0, 8)));
  }, [recentPlays]);

  useEffect(() => {
    localStorage.setItem('mozikako_quality', audioQuality);
  }, [audioQuality]);

  useEffect(() => {
    localStorage.setItem('mozikako_data_saver', dataSaver ? '1' : '0');
  }, [dataSaver]);

  useEffect(() => {
    localStorage.setItem('mozikako_dark_mode', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    if (account) {
      localStorage.setItem('mozikako_account', JSON.stringify(account));
    } else {
      localStorage.removeItem('mozikako_account');
    }
  }, [account]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const provider = params.get('provider');
    const reason = params.get('reason');

    if (oauth === 'success' && provider) {
      setBanner(`${providerMeta[provider]?.label || provider} connected successfully.`);
      setActiveView('settings');
      refreshProviderStatus().catch(() => undefined);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauth === 'error') {
      setError(reason ? decodeURIComponent(reason) : 'OAuth connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const toPlayableTrack = (track) => {
    const playableSource = (track.sources || []).find((source) => source.previewUrl);
    const primarySource = playableSource || track.sources?.[0] || null;
    if (!primarySource) return null;

    return {
      id: `${track.id}::${primarySource.provider}`,
      title: track.title,
      artist: track.artist,
      image:
        track.coverUrl ||
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
      preview: playableSource?.previewUrl || null,
      sourceProvider: primarySource.provider,
      externalUrl: primarySource.externalUrl || null,
    };
  };

  const buildPlayableQueue = (tracks) => tracks.map(toPlayableTrack).filter((item) => item?.preview);

  const pushRecent = (entry) => {
    setRecentPlays((current) => {
      const next = [entry, ...current.filter((item) => item.title !== entry.title || item.artist !== entry.artist)];
      return next.slice(0, 8);
    });
  };

  const playUnifiedTrack = (track, queueTracks = results) => {
    const mapped = toPlayableTrack(track);
    if (!mapped) return;

    setPlayerFallbackTrack(mapped);
    pushRecent({
      id: `${Date.now()}_${mapped.id}`,
      title: mapped.title,
      artist: mapped.artist,
      image: mapped.image,
      provider: mapped.sourceProvider,
    });

    if (mapped.preview) {
      const queue = buildPlayableQueue(queueTracks);
      player.playTrack(mapped, queue.length ? queue : null);
      setActiveView('library');
      return;
    }

    if (mapped.externalUrl) {
      window.open(mapped.externalUrl, '_blank', 'noopener,noreferrer');
      setBanner('No preview available. Opened track on provider.');
      setActiveView('library');
    }
  };

  const openUpgrade = () => {
    setActiveView('settings');
    setBanner('Upgrade flow is ready to be connected to billing.');
  };

  const openNotifications = () => {
    setActiveView('home');
    setBanner(notificationCount ? 'You have updates in your music activity.' : 'No new notifications.');
    setNotificationCount(0);
  };

  const openProfile = () => {
    setActiveView('settings');
    setBanner('Profile and settings are available here.');
  };

  const submitAuth = (event) => {
    event.preventDefault();
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password.trim();
    const name = authForm.name.trim();

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (authMode === 'register') {
      const newAccount = {
        email,
        name: name || email.split('@')[0],
        createdAt: new Date().toISOString(),
      };
      setAccount(newAccount);
      setAuthForm({ email: '', password: '', name: '' });
      setError('');
      setBanner('Account created successfully.');
      setActiveView('home');
      return;
    }

    if (!account) {
      setError('No account found. Create an account first.');
      return;
    }

    if (account.email !== email) {
      setError('This email does not match your local account.');
      return;
    }

    setError('');
    setBanner('Logged in successfully.');
    setActiveView('home');
  };

  const logoutAccount = () => {
    setAccount(null);
    setResults([]);
    setPlayerFallbackTrack(null);
    setBanner('You are now logged out.');
    setAuthMode('login');
  };

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
      setBanner('');
      setIsLoading(true);
      const payload = await universalSearch(trimmed, selectedProviders);
      const tracks = payload.tracks || [];
      setResults(tracks);
      setActiveView('search');

      if (!tracks.length) {
        setBanner('No results found on selected platforms.');
      }
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
      setError('');
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
      setBanner(`${providerMeta[provider]?.label || provider} disconnected.`);
    } catch {
      setError('Unable to disconnect provider.');
    }
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
    setBanner('New mix created.');
  };

  const nowPlaying = player.currentTrack || playerFallbackTrack;
  const upNext = player.queue.length
    ? player.queue.filter((item) => item.id !== player.currentTrack?.id).slice(0, 5)
    : results.slice(0, 5).map(toPlayableTrack).filter(Boolean);

  const renderHome = () => (
    <section className="view-grid">
      <div className="welcome-card block-card">
        <h1>Welcome back</h1>
        <p>Discover new sounds based on your listening profile across platforms.</p>
      </div>

      <div className="block-card">
        <div className="section-head">
          <h2>Recently Played</h2>
          <button type="button" className="ghost-btn" onClick={() => setActiveView('search')}>Discover</button>
        </div>
        <div className="recent-grid">
          {recentPlays.map((item) => (
            <button
              key={item.id}
              type="button"
              className="recent-card"
              onClick={() =>
                {
                  setPlayerFallbackTrack({
                    id: item.id,
                    title: item.title,
                    artist: item.artist,
                    image: item.image,
                    sourceProvider: item.provider,
                    preview: null,
                  });
                  setActiveView('library');
                }
              }
            >
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
            <button
              type="button"
              key={mix.id}
              className="mix-card"
              onClick={() => {
                setQuery(mix.name);
                runSearch(mix.name);
              }}
            >
              <div className={`mix-token ${mix.gradient}`}>{mix.token}</div>
              <div>
                <strong>{mix.name}</strong>
                <span>{mix.subtitle}</span>
              </div>
            </button>
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
            <button type="button" className="play-now" onClick={() => playUnifiedTrack(bestMatch)}>
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
          {results.map((item) => {
            const mapped = toPlayableTrack(item);
            return (
              <div key={item.id} className="table-row">
                <span className="title-col">
                  <strong>{item.title}</strong>
                  <small>{item.artist}</small>
                </span>
                <span>{item.album || 'Single'}</span>
                <span className="provider-stack">
                  {(item.sources || []).slice(0, 3).map((source) => (
                    <span
                      key={`${item.id}-${source.provider}`}
                      className={`tiny-provider ${providerMeta[source.provider]?.colorClass || ''}`}
                    >
                      {providerMeta[source.provider]?.badge || source.provider.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="table-actions">
                  <button type="button" className="play-action" onClick={() => playUnifiedTrack(item)}>
                    <Play size={12} fill="currentColor" />
                    {mapped?.preview ? 'Preview' : 'Open'}
                  </button>
                  {mapped?.externalUrl ? (
                    <a href={mapped.externalUrl} target="_blank" rel="noreferrer" className="open-action">Provider</a>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderPlayer = () => (
    <section className="player-layout">
      <article className="player-main block-card">
        {nowPlaying ? (
          <>
            <img src={nowPlaying.image} alt={nowPlaying.title} className="player-art" />
            <h1>{nowPlaying.title}</h1>
            <p>{nowPlaying.artist}</p>
            <div className="progress-wrap">
              <div className="progress-line"><span style={{ width: `${player.progress || 0}%` }} /></div>
              <div className="time-row">
                <small>{player.formatTime(player.currentTime)}</small>
                <small>{player.formatTime(player.duration)}</small>
              </div>
            </div>
            <div className="player-controls">
              <button type="button" onClick={player.prevTrack}>&#9198;</button>
              <button type="button" className="play-circle" onClick={player.togglePlay} disabled={!player.currentTrack?.preview}>
                {player.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button type="button" onClick={player.nextTrack}>&#9197;</button>
            </div>
            <div className="playing-source">
              Playing from <strong>{providerMeta[nowPlaying.sourceProvider]?.label || 'Universal Source'}</strong>
            </div>
          </>
        ) : (
          <div className="empty-player">
            <Disc3 size={30} />
            <p>Select a track from Search to start playing.</p>
          </div>
        )}
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
              key={item.id}
              className="queue-item"
              onClick={() => {
                if (item.preview) {
                  player.playTrack(item, player.queue.length ? player.queue : upNext.filter((q) => q.preview));
                } else if (item.externalUrl) {
                  window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <img
                src={
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
          <div><span style={{ width: `${(player.volume || 0.8) * 100}%` }} /></div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={player.volume}
            onChange={(event) => player.changeVolume(Number(event.target.value))}
          />
        </div>
      </aside>
    </section>
  );

  const renderSettings = () => (
    <section className="view-grid settings-screen">
      <div className="settings-topbar">
        <h1>Settings</h1>
        <button type="button" className="ghost-btn" onClick={() => refreshProviderStatus().catch(() => undefined)}>
          Refresh
        </button>
      </div>

      <div className="settings-profile block-card">
        <img
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80"
          alt="Profile"
        />
        <div>
          <h2>{account?.name || 'My Account'}</h2>
          <p>{account?.email}</p>
          <span>{hasConnectedAccount ? `${connectedProviders.length} service(s) connected` : 'No music service connected'}</span>
        </div>
      </div>

      <div className="settings-card block-card">
        <div className="settings-card-head">
          <h2>Connected Services</h2>
          <small>Manage all</small>
        </div>
        <div className="settings-services-grid">
          {providerOrder.map((provider) => {
            const meta = providerMeta[provider];
            const connected = Boolean(providerStatus[provider]);
            return (
              <article key={provider} className="settings-service-item">
                <div className="settings-service-main">
                  <div className={`settings-service-icon ${meta.colorClass}`}>{meta.badge}</div>
                  <div>
                    <strong>{meta.label}</strong>
                    <small>{connected ? 'Connected' : 'Not connected'}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${connected ? 'on' : ''}`}
                  disabled={isConnecting === provider}
                  onClick={() => (connected ? disconnectService(provider) : connectProvider(provider))}
                >
                  <span />
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="settings-card block-card">
        <div className="settings-card-head">
          <h2>App Preferences</h2>
        </div>
        <div className="settings-pref-list">
          <article className="settings-pref-item">
            <div>
              <strong>Streaming Quality</strong>
              <small>Choose your preferred audio fidelity</small>
            </div>
            <div className="quality-pill">
              <button
                type="button"
                className={audioQuality.startsWith('Normal') ? 'active' : ''}
                onClick={() => setAudioQuality('Normal (160kbps)')}
              >
                Normal
              </button>
              <button
                type="button"
                className={audioQuality.startsWith('High') ? 'active' : ''}
                onClick={() => setAudioQuality('High (320kbps)')}
              >
                High (320kbps)
              </button>
            </div>
          </article>

          <article className="settings-pref-item">
            <div>
              <strong>Data Saver</strong>
              <small>Reduce quality on mobile data</small>
            </div>
            <button type="button" className={`switch-btn ${dataSaver ? 'on' : ''}`} onClick={() => setDataSaver((v) => !v)}>
              <span />
            </button>
          </article>

          <article className="settings-pref-item">
            <div>
              <strong>Dark Mode</strong>
              <small>Toggle between light and dark theme</small>
            </div>
            <button type="button" className={`switch-btn ${darkMode ? 'on' : ''}`} onClick={() => setDarkMode((v) => !v)}>
              <span />
            </button>
          </article>
        </div>
      </div>

      <button type="button" className="logout-all-btn" onClick={logoutAccount}>
        <LogOut size={14} /> Log Out of All Devices
      </button>
      <p className="settings-footer-note">Mozikako v2.4.0-stable • Built with passion for audiophiles</p>
    </section>
  );

  if (!account) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-box auth-brand">
            <div className="brand-logo"><Sparkles size={16} /></div>
            <div>
              <strong>Mozikako</strong>
              <span>Universal Audio</span>
            </div>
          </div>

          <h1>{authMode === 'login' ? 'Login to your account' : 'Create your account'}</h1>
          <p>Sign in first, then connect Spotify, Apple Music, Deezer, and YouTube from your account page.</p>

          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' ? (
              <input
                placeholder="Display name"
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
              />
            ) : null}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
            />
            {error ? <p className="inline-error">{error}</p> : null}
            <button type="submit" className="auth-submit">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          <button
            type="button"
            className="ghost-btn auth-toggle"
            onClick={() => {
              setAuthMode((current) => (current === 'login' ? 'register' : 'login'));
              setError('');
            }}
          >
            {authMode === 'login' ? 'No account yet? Create one' : 'Already have an account? Login'}
          </button>
        </section>
      </main>
    );
  }

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
          <button type="button" onClick={openUpgrade}>Go Pro</button>
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
            <button type="button" onClick={openNotifications}>
              <Bell size={16} />
            </button>
            <button type="button" onClick={openProfile}><CircleUserRound size={16} /></button>
          </div>
        </header>

        {(banner || error) ? (
          <div className={`banner ${error ? 'error' : ''}`}>
            {error || banner}
          </div>
        ) : null}

        <main className="content-zone">
          {activeView === 'home' ? renderHome() : null}
          {activeView === 'search' ? renderSearch() : null}
          {activeView === 'library' ? renderPlayer() : null}
          {activeView === 'settings' ? renderSettings() : null}
        </main>

        <footer className="bottom-player">
          <div className="now-track">
            {nowPlaying ? <img src={nowPlaying.image} alt={nowPlaying.title} /> : <Disc3 size={20} />}
            <span>
              <strong>{nowPlaying?.title || 'No track selected'}</strong>
              <small>{nowPlaying?.artist || 'Choose a track from Search'}</small>
            </span>
          </div>
          <div className="transport">
            <button type="button" onClick={player.prevTrack}>&#9198;</button>
            <button
              type="button"
              className="play-mini"
              onClick={player.togglePlay}
              disabled={!player.currentTrack?.preview}
            >
              {player.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <button type="button" onClick={player.nextTrack}>&#9197;</button>
          </div>
          <div className="volume-mini">
            <Headphones size={14} />
            <div><span style={{ width: `${(player.volume || 0.8) * 100}%` }} /></div>
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

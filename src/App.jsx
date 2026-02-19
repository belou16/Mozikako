import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search as SearchIcon, 
  Home, 
  Library, 
  Settings, 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  MoreHorizontal, 
  X,
  Plus,
  Sparkles,
  Zap,
  Coffee,
  PartyPopper,
  Check,
  ChevronRight,
  Music,
  Link as LinkIcon,
  Bell,
  Shield,
  Download,
  HelpCircle,
  Info,
  Heart,
  Loader,
  Volume2,
  ExternalLink,
  ChevronDown,
  Activity,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTracks, searchAlbums, getTopCharts, searchYouTube, searchDeezer, getYouTubeEmbedUrl } from './services/musicApi';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { spotifyAuth, deezerAuth, authUtils } from './services/authService';
import './App.css';


/* ============================================
   HELPERS
   ============================================ */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ============================================
   MAIN APP
   ============================================ */
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSmartMixOpen, setIsSmartMixOpen] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('Focus');
  const [connectedSources, setConnectedSources] = useState(['spotify', 'apple']);
  const [activeFilter, setActiveFilter] = useState('All Results');
  const [activeLibraryTab, setActiveLibraryTab] = useState('Playlists');
  const [isFullPlayer, setIsFullPlayer] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Auth States
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [deezerToken, setDeezerToken] = useState(null);
  const [userData, setUserData] = useState({ spotify: null, deezer: null });

  // Real API state
  const [searchResults, setSearchResults] = useState([]);
  const [albumResults, setAlbumResults] = useState([]);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [deezerResults, setDeezerResults] = useState([]);
  const [topCharts, setTopCharts] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [smartMixTracks, setSmartMixTracks] = useState([]);
  const [isGeneratingMix, setIsGeneratingMix] = useState(false);

  // Audio Player
  const player = useAudioPlayer();
  const searchTimeout = useRef(null);

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: SearchIcon, label: 'Search' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const vibes = [
    { id: 'Focus', icon: Sparkles, label: 'Focus', color: '#5856d6', query: 'ambient focus study' },
    { id: 'Energy', icon: Zap, label: 'Energy', color: '#ff9500', query: 'workout energy hype' },
    { id: 'Relax', icon: Coffee, label: 'Relax', color: '#34c759', query: 'chill lofi relax' },
    { id: 'Party', icon: PartyPopper, label: 'Party', color: '#ff2d55', query: 'dance party hits' },
  ];

  const sources = [
    { id: 'spotify', name: 'Spotify', icon: '🎧', color: '#1DB954' },
    { id: 'apple', name: 'Apple Music', icon: '🎵', color: '#FA2D48' },
    { id: 'youtube', name: 'YouTube Music', icon: '▶️', color: '#FF0000' },
  ];

  const filters = ['All Results', 'Songs', 'Albums'];
  const libraryTabs = ['Playlists', 'Liked', 'Artists', 'Albums'];
  
  const genres = [
    { name: 'Pop', icon: '🎤', color: '#ff2d55' },
    { name: 'Hip-Hop', icon: '🔥', color: '#ff9500' },
    { name: 'Rock', icon: '🎸', color: '#af52de' },
    { name: 'Dance', icon: '💃', color: '#5856d6' },
    { name: 'Indie', icon: '✨', color: '#007aff' },
    { name: 'Jazz', icon: '🎺', color: '#34c759' }
  ];

  /* ============================================
     TOAST SYSTEM
     ============================================ */
  const [toast, setToast] = useState(null);
  const showToast = (message, icon = <Check size={16} />) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3000);
  };

  /* ============================================
     AUTH HANDLING
     ============================================ */
  useEffect(() => {
    const params = authUtils.getParamsFromUrl();
    window.location.hash = ""; // Clean URL

    // Handle Spotify token
    const s_token = params.access_token;
    if (s_token && (window.location.hash.includes('access_token') || !params.expires)) {
       // Note: Deezer also uses access_token, so we check origin if possible 
       // but Spotify token is usually much longer than Deezer's temporary test ones
    }

    // A simpler way: Check if we are coming from a specific auth flow
    if (params.access_token) {
      // Logic to distinguish (Spotify tokens are long, Deezer ones vary)
      // For now, let's treat based on length as a heuristic or local storage hint
      const isSpotify = params.access_token.length > 50; 
      
      if (isSpotify) {
        setSpotifyToken(params.access_token);
        localStorage.setItem('spotify_token', params.access_token);
        fetchProfile('spotify', params.access_token);
      } else {
        setDeezerToken(params.access_token);
        localStorage.setItem('deezer_token', params.access_token);
        fetchProfile('deezer', params.access_token);
      }
    } else {
      const s = localStorage.getItem('spotify_token');
      const d = localStorage.getItem('deezer_token');
      if (s) { setSpotifyToken(s); fetchProfile('spotify', s); }
      if (d) { setDeezerToken(d); fetchProfile('deezer', d); }
    }

    // Hide splash after 2.5s
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const fetchProfile = async (source, token) => {
    try {
      if (source === 'spotify') {
        const res = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.id) setUserData(prev => ({ ...prev, spotify: data }));
      } else if (source === 'deezer') {
        const res = await fetch(`https://api.deezer.com/user/me?access_token=${token}`);
        const data = await res.json();
        if (data.id) setUserData(prev => ({ ...prev, deezer: data }));
      }
    } catch (e) {
      console.warn(`${source} profile fetch failed`, e);
    }
  };

  const handleLogin = (source) => {
    if (source === 'spotify') window.location.href = spotifyAuth.loginUrl;
    if (source === 'deezer') window.location.href = deezerAuth.loginUrl;
    if (source === 'apple') alert('Apple Music requires a manual developer token in .env');
  };
  useEffect(() => {
    let cancelled = false;
    async function loadCharts() {
      setIsLoadingCharts(true);
      try {
        const [charts, trending] = await Promise.all([
          getTopCharts(10),
          searchTracks('top hits 2025', 10)
        ]);
        if (!cancelled) {
          setTopCharts(charts);
          setTopTracks(trending);
        }
      } catch (e) {
        console.warn('Failed to load charts:', e);
      } finally {
        if (!cancelled) setIsLoadingCharts(false);
      }
    }
    loadCharts();
    return () => { cancelled = true; };
  }, []);

  /* ============================================
     SEARCH WITH DEBOUNCE
     ============================================ */
  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    setIsSearching(value.length > 0);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (value.trim().length < 2) {
      setSearchResults([]);
      setAlbumResults([]);
      setYoutubeResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsLoadingSearch(true);
      try {
        const [tracks, albums, yt, dz] = await Promise.all([
          searchTracks(value, 8),
          searchAlbums(value, 5),
          searchYouTube(value, 4),
          searchDeezer(value, 6)
        ]);
        setSearchResults(tracks);
        setAlbumResults(albums);
        setYoutubeResults(yt);
        setDeezerResults(dz);
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 400);
  }, []);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      const bestTrack = searchResults.find(t => t.preview) || deezerResults.find(t => t.preview);
      if (bestTrack) {
        handlePlayTrack({ ...bestTrack, source: bestTrack.source || 'iTunes' });
        showToast(`Playing Magic Match: ${bestTrack.title}`, <Sparkles size={16} />);
      }
    }
  };

  const toggleSource = (id) => {
    setConnectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleLike = (track) => {
    setLikedSongs(prev => {
      const exists = prev.find(t => t.id === track.id);
      if (exists) {
        showToast("Removed from Library", <Heart size={16} />);
        return prev.filter(t => t.id !== track.id);
      }
      showToast("Added to Library", <Heart size={16} fill="#ff2d55" color="#ff2d55" />);
      return [...prev, track];
    });
  };

  const isLiked = (trackId) => likedSongs.some(t => t.id === trackId);

  const handlePlayTrack = (track, queue = null) => {
    if (!track.preview) return;
    player.playTrack(track, queue || searchResults.filter(t => t.preview));
  };

  /* ============================================
     SMART MIX — Generate real playlist
     ============================================ */
  const generateSmartMix = async () => {
    setIsGeneratingMix(true);
    const vibe = vibes.find(v => v.id === selectedVibe);
    try {
      // Aggregate from multiple sources for a "Truly Smart" mix
      const [itunes, deezer] = await Promise.all([
        connectedSources.includes('apple') ? searchTracks(vibe.query, 6) : Promise.resolve([]),
        connectedSources.includes('deezer') ? searchDeezer(vibe.query, 6) : Promise.resolve([])
      ]);
      
      const combined = [
        ...itunes.map(t => ({ ...t, source: 'iTunes' })),
        ...deezer.map(t => ({ ...t, source: 'Deezer' }))
      ].sort(() => Math.random() - 0.5); // Shuffle

      setSmartMixTracks(combined);
      setIsSmartMixOpen(false);
      setActiveTab('library');
      setActiveLibraryTab('Playlists');
      showToast(`${selectedVibe} Mix: ${combined.length} Tracks`, <Sparkles size={16} />);
      
      const playable = combined.find(t => t.preview);
      if (playable) player.playTrack(playable, combined.filter(t => t.preview));
    } catch (e) {
      console.warn('Smart Mix error:', e);
      showToast("Mix Generation Failed", <X size={16} />);
    } finally {
      setIsGeneratingMix(false);
    }
  };

  /* ============================================
     HOME VIEW
     ============================================ */
  /* ============================================
     HOME VIEW
     ============================================ */
  const renderHome = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="home-view"
    >
      <div className="home-greeting">
        <div className="greeting-label">{getGreeting()}</div>
        <h1>Listen Now</h1>
      </div>

      {/* Quick Picks for fast access */}
      <div className="home-section">
        <div className="home-section-title">Fresh Picks</div>
        <div className="quick-picks">
          {(topTracks.length > 0 ? topTracks : searchResults).slice(0, 6).map(track => (
            <div key={track.id} className="quick-pick-card" onClick={() => handlePlayTrack(track)}>
              <img src={track.image} alt={track.title} />
              <div className="quick-pick-info">
                <span className="qp-title">{track.title}</span>
                <span className="qp-artist">{track.artist}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moods — Interactive discovery */}
      <div className="home-section">
        <div className="home-section-title">Your Moods</div>
        <div className="mood-grid">
          {vibes.map(v => (
            <div key={v.id} className="mood-card" style={{ background: `linear-gradient(135deg, ${v.color}15, ${v.color}40)` }} onClick={() => {
              setSelectedVibe(v.id);
              setIsSmartMixOpen(true);
            }}>
              <v.icon size={24} color={v.color} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played / Trending */}
      <div className="home-section">
        <div className="home-section-title">Trending Now</div>
        <div className="horizontal-scroll">
          {(topTracks.length > 6 ? topTracks.slice(6, 14) : topCharts).map((item, i) => (
            <div key={item.id || i} className="scroll-card" onClick={() => handlePlayTrack(item)}>
              <div className="scroll-card-img-wrapper">
                <img className="scroll-card-img" src={item.image} alt={item.title} />
                <button className="card-play-btn"><Play size={16} fill="white" /></button>
              </div>
              <div className="scroll-card-title">{item.title}</div>
              <div className="scroll-card-subtitle">{item.artist}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Browse Categories */}
      <div className="home-section">
        <div className="home-section-title">Browse Categories</div>
        <div className="genre-grid">
          {genres.map(g => (
            <div key={g.name} className="genre-card" style={{ borderLeft: `4px solid ${g.color}` }} onClick={() => {
              setActiveTab('search');
              handleSearch(g.name);
            }}>
              <span className="genre-icon">{g.icon}</span>
              <span>{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Playlists simulation */}
      <div className="home-section">
        <div className="home-section-title">Curated for You</div>
        <div className="horizontal-scroll">
          {[
            { title: 'Global Top 50', icon: '🌍', color: '#1db954' },
            { title: 'Chill Mix', icon: '🌌', color: '#5856d6' },
            { title: 'Daily Drive', icon: '🚗', color: '#ff9500' },
            { title: 'Release Radar', icon: '🛰️', color: '#ff2d55' }
          ].map(pl => (
            <div key={pl.title} className="scroll-card playlist" onClick={() => handleSearch(pl.title)}>
              <div className="scroll-card-img playlist-gradient" style={{ background: `linear-gradient(45deg, ${pl.color}, #000)` }}>
                <span style={{ fontSize: 32 }}>{pl.icon}</span>
              </div>
              <div className="scroll-card-title">{pl.title}</div>
              <div className="scroll-card-subtitle">Playlist • Mozikako</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Tracks list */}
      <div className="home-section" style={{ paddingBottom: 40 }}>
        <div className="home-section-title">World Charts</div>
        <div className="track-list">
          {topTracks.map(track => (
              <div 
                key={track.id} 
                className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                onClick={() => handlePlayTrack(track, topTracks)}
              >
                <div className="track-img-wrapper">
                  <img src={track.image} alt={track.title} />
                </div>
                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <div className="track-subtitle">{track.artist}</div>
                </div>
                <button className="like-btn" onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
                  <Heart size={18} fill={isLiked(track.id) ? '#ff2d55' : 'none'} color={isLiked(track.id) ? '#ff2d55' : 'var(--text-tertiary)'} />
                </button>
                <div className="play-indicator-small">
                  {player.currentTrack?.id === track.id && player.isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
                </div>
              </div>
            ))}
        </div>
      </div>
    </motion.div>
  );

  /* ============================================
     VIEWS
     ============================================ */
  const renderSearch = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="search-view"
    >
      {/* Search Bar */}
      <div className="search-header glass">
        <div className="search-input-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="Artists, songs, or albums"
          />
          {searchQuery && <X size={18} className="clear-icon" onClick={() => handleSearch('')} />}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips">
        {filters.map(f => (
          <button 
            key={f} 
            className={`chip ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {!isSearching ? (
        <>
          {/* Browse section with top charts */}
          <div className="home-section">
            <div className="home-section-title">Browse All</div>
            <div className="horizontal-scroll">
              {topCharts.slice(0, 5).map((item, i) => (
                <div key={item.id || i} className="scroll-card" onClick={() => handleSearch(item.title || '')}>
                  {item.image ? (
                    <img className="scroll-card-img" src={item.image} alt={item.title} />
                  ) : (
                    <div className="scroll-card-img placeholder-img"><Music size={32} /></div>
                  )}
                  <div className="scroll-card-title">{item.title}</div>
                  <div className="scroll-card-subtitle">{item.artist}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Genre Suggestions */}
          <div className="home-section">
            <div className="home-section-title">Popular Searches</div>
            <div className="genre-grid">
              {['Pop Hits', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'R&B'].map(genre => (
                <button key={genre} className="genre-card" onClick={() => handleSearch(genre)}>
                  <Music size={20} />
                  <span>{genre}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {isLoadingSearch && (
            <div className="loading-indicator">
              <Loader size={24} className="spin" />
              <span>Searching...</span>
            </div>
          )}

          {searchResults.length > 0 && !isLoadingSearch && activeFilter === 'All Results' && (
            <div className="top-result-container">
              <div className="section-header">
                <h3>Top Result</h3>
              </div>
              <div className="top-result-card glass" onClick={() => handlePlayTrack(searchResults[0])}>
                <div className="top-result-content">
                  <img src={searchResults[0].image} alt="" className="top-result-img" />
                  <div className="top-result-info">
                    <span className="top-result-title">{searchResults[0].title}</span>
                    <span className="top-result-artist">{searchResults[0].artist} • Song</span>
                    <button className="top-result-play-btn">
                       {player.currentTrack?.id === searchResults[0].id && player.isPlaying ? <Pause size={24} fill="black" stroke="none" /> : <Play size={24} fill="black" stroke="none" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Songs Section (iTunes) */}
          {(activeFilter === 'All Results' || activeFilter === 'Songs') && searchResults.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <div className="service-badge apple">
                  <div className="service-icon">🎵</div>
                  <span>SONGS</span>
                </div>
                <span className="result-count">{searchResults.length} results</span>
              </div>
              <div className="track-list">
                {searchResults.map(track => (
                  <div 
                    key={track.id} 
                    className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="track-img-wrapper">
                      <img src={track.image} alt={track.title} />
                      {player.currentTrack?.id === track.id && player.isPlaying && (
                        <div className="playing-indicator">
                          <div className="bar" /><div className="bar" /><div className="bar" />
                        </div>
                      )}
                    </div>
                    <div className="track-info">
                      <div className="track-title">{track.title}</div>
                      <div className="track-subtitle">{track.artist} • {track.duration}</div>
                    </div>
                    <button className="like-btn" onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
                      <Heart size={18} fill={isLiked(track.id) ? '#ff2d55' : 'none'} color={isLiked(track.id) ? '#ff2d55' : 'var(--text-tertiary)'} />
                    </button>
                    {track.preview ? (
                      <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }}>
                        {player.currentTrack?.id === track.id && player.isPlaying 
                          ? <Pause size={16} fill="white" /> 
                          : <Play size={16} fill="white" />}
                      </button>
                    ) : (
                      <div className="no-preview-badge">No preview</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {(activeFilter === 'All Results' || activeFilter === 'Albums') && albumResults.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <div className="service-badge apple">
                  <div className="service-icon">💿</div>
                  <span>ALBUMS</span>
                </div>
              </div>
              <div className="album-list">
                {albumResults.map(album => (
                  <div key={album.id} className="album-card" onClick={() => handleSearch(album.title + ' ' + album.artist)}>
                    <img src={album.image} alt={album.title} />
                    <div className="album-info">
                      <div className="album-title">{album.title}</div>
                      <div className="album-subtitle">{album.artist} • {album.releaseDate}</div>
                      {album.genre && <div className="album-badge">{album.genre}</div>}
                    </div>
                    <ChevronRight size={18} color="var(--text-tertiary)" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Deezer Section */}
          {(activeFilter === 'All Results' || activeFilter === 'Songs') && deezerResults.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <div className="service-badge" style={{ color: '#ff0000' }}>
                  <div className="service-icon">🎶</div>
                  <span>DEEZER</span>
                </div>
              </div>
              <div className="track-list">
                {deezerResults.map(track => (
                  <div 
                    key={track.id} 
                    className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="track-img-wrapper">
                      <img src={track.image} alt={track.title} />
                    </div>
                    <div className="track-info">
                      <div className="track-title">{track.title}</div>
                      <div className="track-subtitle">{track.artist} • Deezer</div>
                    </div>
                    {track.preview && (
                      <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }}>
                        {player.currentTrack?.id === track.id && player.isPlaying 
                          ? <Pause size={16} fill="white" /> 
                          : <Play size={16} fill="white" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* YouTube Section */}
          {(activeFilter === 'All Results') && youtubeResults.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <div className="service-badge youtube">
                  <div className="service-icon">▶️</div>
                  <span>YOUTUBE</span>
                </div>
              </div>
              <div className="video-grid">
                {youtubeResults.map(video => (
                  <a 
                    key={video.id} 
                    className="video-card"
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="video-thumb-container">
                      <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} />
                      <div className="video-duration">{video.duration}</div>
                      <div className="video-play-overlay"><Play size={24} fill="white" /></div>
                    </div>
                    <div className="video-info">
                      <div className="video-title-row">
                        <div className="video-title">{video.title}</div>
                        <ExternalLink size={14} />
                      </div>
                      <div className="video-subtitle">{video.channel} • {video.views}</div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {!isLoadingSearch && searchResults.length === 0 && albumResults.length === 0 && searchQuery.length >= 2 && (
            <div className="no-results">
              <SearchIcon size={48} color="var(--text-tertiary)" />
              <p>No results for "{searchQuery}"</p>
              <span>Try different keywords</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );

  /* ============================================
     LIBRARY VIEW
     ============================================ */
  const renderLibrary = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="library-view"
    >
      <div className="library-header">
        <h1>Your Library</h1>
        <div className="header-actions">
          <button className="icon-button"><Plus size={24} /></button>
          <button className="icon-button"><SearchIcon size={22} /></button>
        </div>
      </div>

      <div className="library-tabs">
        {libraryTabs.map(tab => (
          <button 
            key={tab}
            className={`library-tab ${activeLibraryTab === tab ? 'active' : ''}`}
            onClick={() => setActiveLibraryTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeLibraryTab === 'Playlists' && (
        <div className="library-content">
          <div className="section-title-row">
            <h3>Featured Playlists</h3>
          </div>
          <div className="playlist-grid">
            <div className="playlist-card library" onClick={() => setActiveLibraryTab('Liked')}>
              <div className="pl-artwork-gradient liked">
                <Heart fill="white" size={32} />
              </div>
              <div className="pl-info">
                <div className="pl-title">Liked Songs</div>
                <div className="pl-count">{likedSongs.length} songs</div>
              </div>
            </div>
            
            {smartMixTracks.length > 0 && (
              <div className="playlist-card library" onClick={() => handlePlayTrack(smartMixTracks[0], smartMixTracks)}>
                <div className="pl-artwork-gradient smart">
                  <Sparkles fill="white" size={32} />
                </div>
                <div className="pl-info">
                  <div className="pl-title">Recent Smart Mix</div>
                  <div className="pl-count">{smartMixTracks.length} tracks</div>
                </div>
              </div>
            )}

            <div className="playlist-card library">
              <div className="pl-artwork-gradient chill">
                <Music fill="white" size={32} />
              </div>
              <div className="pl-info">
                <div className="pl-title">Chill Vibes</div>
                <div className="pl-count">Custom Selection</div>
              </div>
            </div>
          </div>

          <div className="section-title-row" style={{ marginTop: 32 }}>
            <h3>Made for You</h3>
          </div>
          <div className="horizontal-scroll gap-small">
            {[1, 2, 3].map(i => (
              <div key={i} className="scroll-card mini">
                <div className="scroll-card-img placeholder-gradient" style={{ filter: `hue-rotate(${i * 60}deg)` }}>
                  <Sparkles size={32} />
                </div>
                <div className="scroll-card-title">Daily Mix {i}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeLibraryTab === 'Liked' && (
        <div className="library-content">
          {likedSongs.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} color="var(--text-tertiary)" />
              <p>No liked songs yet</p>
              <span>Tap the heart icon on any track to save it here</span>
            </div>
          ) : (
            <div className="track-list">
              <div className="list-controls">
                <button className="btn-play-all" onClick={() => handlePlayTrack(likedSongs[0], likedSongs)}>
                  <Play size={16} fill="black" /> Play All
                </button>
              </div>
              {likedSongs.map(track => (
                <div 
                  key={track.id} 
                  className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                  onClick={() => handlePlayTrack(track, likedSongs)}
                >
                  <div className="track-img-wrapper">
                    <img src={track.image} alt={track.title} />
                  </div>
                  <div className="track-info">
                    <div className="track-title">{track.title}</div>
                    <div className="track-subtitle">{track.artist}</div>
                  </div>
                  <button className="like-btn" onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
                    <Heart size={18} fill="#ff2d55" color="#ff2d55" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeLibraryTab === 'Artists' || activeLibraryTab === 'Albums') && (
        <div className="empty-state full-height">
          <Library size={48} color="var(--text-tertiary)" />
          <p>This section is empty</p>
          <span>Continue searching for music to populate your {activeLibraryTab}</span>
        </div>
      )}
    </motion.div>
  );

  /* ============================================
     SETTINGS VIEW
     ============================================ */
  const renderSettings = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="settings-view"
    >
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Connected Services</div>
        <div className="settings-card">
          {sources.map(s => (
            <div key={s.id} className="settings-item" onClick={() => handleLogin(s.id)}>
              <div className="settings-item-left">
                <div className="settings-item-icon" style={{ background: s.color + '22' }}>{s.icon}</div>
                <div className="settings-item-col">
                  <span className="settings-item-label">{s.name}</span>
                  {userData[s.id] && (
                    <span className="source-connected-name">Connected as {userData[s.id].display_name || userData[s.id].name}</span>
                  )}
                </div>
              </div>
              <div className={`toggle-switch ${(spotifyToken && s.id === 'spotify') || (deezerToken && s.id === 'deezer') ? 'on' : ''}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Music Experience</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#5856d622' }}>
                <Volume2 size={16} />
              </div>
              <span className="settings-item-label">Master Volume</span>
            </div>
            <div className="volume-slider-wrapper">
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={player.volume} 
                onChange={(e) => player.changeVolume(parseFloat(e.target.value))} 
                className="volume-slider"
              />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#5856d622' }}>
                <Music size={16} />
              </div>
              <span className="settings-item-label">Audio Quality</span>
            </div>
            <div className="settings-item-value">
              <span>Automatic</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#34c75922' }}>
                <Activity size={16} />
              </div>
              <span className="settings-item-label">Equalizer</span>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Data & Storage</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#ff950022' }}>
                <Download size={16} />
              </div>
              <span className="settings-item-label">Downloads</span>
            </div>
            <div className="settings-item-value">
              <span>0 KB used</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#ff3b3022' }}>
                <Trash size={16} />
              </div>
              <span className="settings-item-label" style={{ color: '#ff3b30' }}>Clear Cache</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">About</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#48484a22' }}>
                <Info size={16} />
              </div>
              <span className="settings-item-label">Version</span>
            </div>
            <span className="settings-item-value">1.1.0</span>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#48484a22' }}>
                <Shield size={16} />
              </div>
              <span className="settings-item-label">Terms of Service</span>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <p>Mozikako is a unified music experience.</p>
        <span>Made with ❤️ for Music Lovers</span>
      </div>
    </motion.div>
  );

  /* ============================================
     FULL SCREEN PLAYER
     ============================================ */
  const renderFullPlayer = () => {
    if (!player.currentTrack) return null;
    const track = player.currentTrack;
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="full-player"
      >
        <div className="full-player-header">
          <button className="icon-button" onClick={() => setIsFullPlayer(false)}>
            <ChevronDown size={28} />
          </button>
          <div className="full-player-source">Playing from iTunes</div>
          <button className="icon-button">
            <MoreHorizontal size={24} />
          </button>
        </div>

        <div className="full-player-artwork">
          <img src={track.image} alt={track.title} />
        </div>

        <div className="full-player-info">
          <div className="full-player-title">{track.title}</div>
          <div className="full-player-artist">{track.artist}</div>
        </div>

        {/* Progress Bar */}
        <div className="full-player-progress">
          <div 
            className="progress-bar-bg"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              player.seek(pct);
            }}
          >
            <div className="progress-bar-fill" style={{ width: `${player.progress}%` }}>
              <div className="progress-bar-knob" />
            </div>
          </div>
          <div className="progress-times">
            <span>{player.formatTime(player.currentTime)}</span>
            <span>{player.formatTime(player.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="full-player-controls">
          <button className="control-btn" onClick={player.prevTrack}>
            <SkipBack size={28} fill="white" />
          </button>
          <button className="control-btn main-play" onClick={player.togglePlay}>
            {player.isPlaying 
              ? <Pause size={32} fill="white" />
              : <Play size={32} fill="white" />}
          </button>
          <button className="control-btn" onClick={player.nextTrack}>
            <SkipForward size={28} fill="white" />
          </button>
        </div>

        {/* Like + Volume */}
        <div className="full-player-bottom">
          <button className="icon-button" onClick={() => toggleLike(track)}>
            <Heart size={24} fill={isLiked(track.id) ? '#ff2d55' : 'none'} color={isLiked(track.id) ? '#ff2d55' : 'white'} />
          </button>
          <div className="volume-control">
            <Volume2 size={16} color="var(--text-secondary)" />
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={player.volume} 
              onChange={(e) => player.changeVolume(parseFloat(e.target.value))}
              className="volume-slider-full"
            />
          </div>
        </div>
      </motion.div>
    );
  };

  const renderNowPlayingBar = () => {
    if (!player.currentTrack || isFullPlayer) return null;
    return (
      <motion.div 
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="now-playing-bar" 
        onClick={() => setIsFullPlayer(true)}
      >
        <img className="now-playing-img" src={player.currentTrack.image} alt="Now Playing" />
        <div className="now-playing-info">
          <div className="now-playing-title">{player.currentTrack.title}</div>
          <div className="now-playing-artist">
            {player.currentTrack.artist} • <span className="source-label">{player.currentTrack.source || 'iTunes'}</span>
          </div>
        </div>
        <div className="now-playing-controls">
          <button onClick={(e) => { e.stopPropagation(); player.togglePlay(); }}>
            {player.isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); player.nextTrack(); }}>
            <SkipForward size={22} fill="white" />
          </button>
        </div>
        <div className="progress-line">
          <div className="progress-line-fill" style={{ width: `${player.progress}%` }} />
        </div>
        {player.isLoading && (
          <div className="now-playing-loading">
            <Loader size={14} className="spin" />
          </div>
        )}
      </motion.div>
    );
  };

  /* ============================================
     RENDER
     ============================================ */
  if (showSplash) {
    return (
      <div className="splash-screen">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="splash-logo"
        >
          <div className="splash-icon-wrapper">
            <Music size={64} color="white" />
          </div>
          <h1>Mozikako</h1>
          <p>Music without boundaries</p>
        </motion.div>
        <div className="splash-loader">
          <div className="loader-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Main Content Scrollable Area */}
      <div className="app-container">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'library' && renderLibrary()}
          {activeTab === 'settings' && renderSettings()}
        </AnimatePresence>
      </div>

      {/* Persistent UI Elements */}
      <AnimatePresence>
        {!isFullPlayer && activeTab !== 'settings' && (
          <button 
            className="smart-mix-fab glass"
            onClick={() => setIsSmartMixOpen(true)}
          >
            <Sparkles size={20} />
            <span>Smart Mix</span>
          </button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renderNowPlayingBar()}
        {isFullPlayer && renderFullPlayer()}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="toast glass"
          >
            {toast.icon}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isSmartMixOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="smart-mix-modal glass"
          >
            <div className="modal-handle" onClick={() => setIsSmartMixOpen(false)} />
            <div className="modal-header">
              <button className="close-btn" onClick={() => setIsSmartMixOpen(false)}><X /></button>
              <h3>Smart Mix</h3>
              <div style={{ width: 24 }} />
            </div>

            <div className="modal-content">
              <h2>What's the vibe?</h2>
              <div className="vibe-selector">
                {vibes.map(vibe => (
                  <button 
                    key={vibe.id} 
                    className={`vibe-btn ${selectedVibe === vibe.id ? 'active' : ''}`}
                    onClick={() => setSelectedVibe(vibe.id)}
                  >
                    <div className="vibe-icon-wrapper" style={{ backgroundColor: selectedVibe === vibe.id ? vibe.color : 'rgba(255,255,255,0.05)' }}>
                      <vibe.icon size={28} />
                    </div>
                    <span>{vibe.label}</span>
                  </button>
                ))}
              </div>

              <h2 style={{ marginTop: 40 }}>Sources</h2>
              <div className="source-list">
                {sources.map(source => (
                  <div 
                    key={source.id} 
                    className={`source-item ${connectedSources.includes(source.id) ? 'active' : ''}`}
                    onClick={() => toggleSource(source.id)}
                  >
                    <div className="source-main">
                      <div className="source-icon-bg" style={{ backgroundColor: source.color + '22' }}>
                        {source.icon}
                      </div>
                      <div className="source-details">
                        <div className="source-name">{source.name}</div>
                        <div className="source-status">{connectedSources.includes(source.id) ? 'Connected' : 'Disconnected'}</div>
                      </div>
                    </div>
                    <div className={`checkbox ${connectedSources.includes(source.id) ? 'checked' : ''}`}>
                      {connectedSources.includes(source.id) && <Check size={14} color="white" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="generate-section">
                <div className="wave-bg" />
                <button 
                   className="generate-btn"
                   onClick={generateSmartMix}
                   disabled={isGeneratingMix}
                >
                  {isGeneratingMix ? (
                    <>
                      <Loader size={18} className="spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Generate Mix</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className={`bottom-nav glass ${isFullPlayer ? 'hidden' : ''}`}>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;

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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTracks, searchAlbums, getTopCharts, getMockYouTubeResults, getYouTubeEmbedUrl } from './services/musicApi';
import { useAudioPlayer } from './hooks/useAudioPlayer';
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

  // Real API state
  const [searchResults, setSearchResults] = useState([]);
  const [albumResults, setAlbumResults] = useState([]);
  const [youtubeResults, setYoutubeResults] = useState([]);
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

  /* ============================================
     LOAD TOP CHARTS ON MOUNT
     ============================================ */
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
        const [tracks, albums] = await Promise.all([
          searchTracks(value, 6),
          searchAlbums(value, 3),
        ]);
        const yt = getMockYouTubeResults(value);
        setSearchResults(tracks);
        setAlbumResults(albums);
        setYoutubeResults(yt);
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 400);
  }, []);

  const toggleSource = (id) => {
    setConnectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleLike = (track) => {
    setLikedSongs(prev => {
      const exists = prev.find(t => t.id === track.id);
      if (exists) return prev.filter(t => t.id !== track.id);
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
      const tracks = await searchTracks(vibe.query, 10);
      setSmartMixTracks(tracks);
      setIsSmartMixOpen(false);
      setActiveTab('library');
      setActiveLibraryTab('Playlists');
      // Auto-play first track with preview
      const playable = tracks.find(t => t.preview);
      if (playable) {
        player.playTrack(playable, tracks.filter(t => t.preview));
      }
    } catch (e) {
      console.warn('Smart Mix error:', e);
    } finally {
      setIsGeneratingMix(false);
    }
  };

  /* ============================================
     HOME VIEW
     ============================================ */
  const renderHome = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="home-view"
    >
      <div className="home-greeting">
        <div className="greeting-label">{getGreeting()}</div>
        <h1>Listen Now</h1>
      </div>

      {/* Top Charts */}
      <div className="home-section">
        <div className="home-section-title">
          {isLoadingCharts ? 'Loading Charts...' : 'Top Charts'}
        </div>
        {isLoadingCharts ? (
          <div className="loading-indicator">
            <Loader size={24} className="spin" />
          </div>
        ) : (
          <div className="horizontal-scroll">
            {topCharts.map((item, i) => (
              <div 
                key={item.id || i} 
                className="scroll-card"
                onClick={() => handleSearch(item.title || '')}
              >
                {item.image ? (
                  <img className="scroll-card-img" src={item.image} alt={item.title} />
                ) : (
                  <div className="scroll-card-img placeholder-img">
                    <Music size={32} />
                  </div>
                )}
                <div className="scroll-card-title">{item.title}</div>
                <div className="scroll-card-subtitle">{item.artist}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Tracks (playable) */}
      {topTracks.length > 0 && (
        <div className="home-section">
          <div className="home-section-title">Trending Now</div>
          <div className="track-list">
            {topTracks.slice(0, 5).map(track => (
              <div 
                key={track.id} 
                className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                onClick={() => handlePlayTrack(track, topTracks)}
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
                  <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlayTrack(track, topTracks); }}>
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
        </div>
      )}

      {/* Quick Section for recent searches */}
      {smartMixTracks.length > 0 && (
        <div className="home-section">
          <div className="home-section-title">Your Smart Mix</div>
          <div className="horizontal-scroll">
            {smartMixTracks.slice(0, 6).map((track, i) => (
              <div 
                key={track.id || i} 
                className="scroll-card"
                onClick={() => handlePlayTrack(track, smartMixTracks)}
              >
                <img className="scroll-card-img" src={track.image} alt={track.title} />
                <div className="scroll-card-title">{track.title}</div>
                <div className="scroll-card-subtitle">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  /* ============================================
     SEARCH VIEW
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
        <button className="icon-button"><Plus size={24} /></button>
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

      {activeLibraryTab === 'Liked' && (
        <>
          {likedSongs.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} color="var(--text-tertiary)" />
              <p>No liked songs yet</p>
              <span>Tap the heart icon on any track to save it here</span>
            </div>
          ) : (
            <div className="track-list">
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
                    <div className="track-subtitle">{track.artist} • {track.duration}</div>
                  </div>
                  <button className="like-btn" onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
                    <Heart size={18} fill="#ff2d55" color="#ff2d55" />
                  </button>
                  {track.preview && (
                    <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlayTrack(track, likedSongs); }}>
                      {player.currentTrack?.id === track.id && player.isPlaying 
                        ? <Pause size={16} fill="white" /> 
                        : <Play size={16} fill="white" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeLibraryTab === 'Playlists' && (
        <>
          {smartMixTracks.length > 0 && (
            <div className="smart-mix-playlist">
              <div className="playlist-item">
                <div className="playlist-cover-gradient">
                  <Sparkles size={24} />
                </div>
                <div className="playlist-item-info">
                  <div className="playlist-item-title">Smart Mix — {selectedVibe}</div>
                  <div className="playlist-item-meta">
                    <span>AI Generated • {smartMixTracks.length} songs</span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </div>
              <div className="track-list">
                {smartMixTracks.map(track => (
                  <div 
                    key={track.id}
                    className={`track-item ${player.currentTrack?.id === track.id ? 'now-active' : ''}`}
                    onClick={() => handlePlayTrack(track, smartMixTracks)}
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
                    {track.preview && (
                      <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlayTrack(track, smartMixTracks); }}>
                        {player.currentTrack?.id === track.id && player.isPlaying 
                          ? <Pause size={16} fill="white" /> 
                          : <Play size={16} fill="white" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {likedSongs.length > 0 && (
            <div className="playlist-item" onClick={() => setActiveLibraryTab('Liked')}>
              <div className="playlist-cover-gradient liked">
                <Heart size={24} />
              </div>
              <div className="playlist-item-info">
                <div className="playlist-item-title">Liked Songs</div>
                <div className="playlist-item-meta">
                  <span>Playlist • {likedSongs.length} songs</span>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-tertiary)" />
            </div>
          )}

          {smartMixTracks.length === 0 && likedSongs.length === 0 && (
            <div className="empty-state">
              <Library size={48} color="var(--text-tertiary)" />
              <p>Your library is empty</p>
              <span>Use Smart Mix or like songs to build your collection</span>
            </div>
          )}
        </>
      )}

      {activeLibraryTab === 'Artists' && (
        <div className="empty-state">
          <Music size={48} color="var(--text-tertiary)" />
          <p>No followed artists</p>
          <span>Search and discover new artists</span>
        </div>
      )}

      {activeLibraryTab === 'Albums' && (
        <div className="empty-state">
          <Music size={48} color="var(--text-tertiary)" />
          <p>No saved albums</p>
          <span>Browse and save albums while searching</span>
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
            <div key={s.id} className="settings-item" onClick={() => toggleSource(s.id)}>
              <div className="settings-item-left">
                <div className="settings-item-icon" style={{ background: s.color + '22' }}>{s.icon}</div>
                <span className="settings-item-label">{s.name}</span>
              </div>
              <div className={`toggle-switch ${connectedSources.includes(s.id) ? 'on' : ''}`} />
            </div>
          ))}
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#fc3c4422' }}>🎶</div>
              <span className="settings-item-label">Deezer</span>
            </div>
            <div className="toggle-switch" />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Playback</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#5856d622' }}>
                <Volume2 size={16} />
              </div>
              <span className="settings-item-label">Volume</span>
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
              <span>High</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#ff950022' }}>
                <Download size={16} />
              </div>
              <span className="settings-item-label">Download Quality</span>
            </div>
            <div className="settings-item-value">
              <span>Lossless</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#34c75922' }}>
                <LinkIcon size={16} />
              </div>
              <span className="settings-item-label">Crossfade</span>
            </div>
            <div className="toggle-switch on" />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">General</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#ff2d5522' }}>
                <Bell size={16} />
              </div>
              <span className="settings-item-label">Notifications</span>
            </div>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#007aff22' }}>
                <Shield size={16} />
              </div>
              <span className="settings-item-label">Privacy</span>
            </div>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#8e8e9322' }}>
                <HelpCircle size={16} />
              </div>
              <span className="settings-item-label">Help & Support</span>
            </div>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-icon" style={{ background: '#48484a22' }}>
                <Info size={16} />
              </div>
              <span className="settings-item-label">About Mozikako</span>
            </div>
            <div className="settings-item-value">
              <span>v1.0.0</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
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

  /* ============================================
     RENDER
     ============================================ */
  return (
    <div className="app-shell">
      {/* Main Content */}
      <div className="app-container">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'library' && renderLibrary()}
          {activeTab === 'settings' && renderSettings()}
        </AnimatePresence>
      </div>

      {/* Floating Smart Mix Button */}
      {activeTab !== 'settings' && !isFullPlayer && (
        <button 
          className="smart-mix-fab glass"
          onClick={() => setIsSmartMixOpen(true)}
        >
          <Sparkles size={20} />
          <span>Smart Mix</span>
        </button>
      )}

      {/* Now Playing Bar — Connected to real player */}
      {player.currentTrack && !isFullPlayer && (
        <div className="now-playing-bar" onClick={() => setIsFullPlayer(true)}>
          <img className="now-playing-img" src={player.currentTrack.image} alt="Now Playing" />
          <div className="now-playing-info">
            <div className="now-playing-title">{player.currentTrack.title}</div>
            <div className="now-playing-artist">{player.currentTrack.artist}</div>
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
        </div>
      )}

      {/* Full Screen Player */}
      <AnimatePresence>
        {isFullPlayer && renderFullPlayer()}
      </AnimatePresence>

      {/* Smart Mix Modal */}
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

import { useEffect, useMemo, useState } from 'react';
import { Disc3, Search, Link2, Music2, Sparkles } from 'lucide-react';
import {
  disconnectProvider,
  fetchProviderStatus,
  getProviderConnectLink,
  universalSearch,
} from './services/musicApi';
import './App.css';

const providerLabels = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  deezer: 'Deezer',
  youtube: 'YouTube Music',
};

const providerOrder = ['spotify', 'apple', 'deezer', 'youtube'];

function SourceBadges({ sources }) {
  return (
    <div className="source-row">
      {sources.map((source) => (
        <span className="source-badge" key={`${source.provider}-${source.providerTrackId}`}>
          {providerLabels[source.provider] || source.provider}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [providerStatus, setProviderStatus] = useState({});
  const [isConnecting, setIsConnecting] = useState('');
  const [providers, setProviders] = useState({
    spotify: true,
    apple: true,
    deezer: true,
    youtube: true,
  });

  const selectedProviders = useMemo(
    () => providerOrder.filter((provider) => providers[provider]),
    [providers],
  );

  useEffect(() => {
    let isMounted = true;
    fetchProviderStatus()
      .then((payload) => {
        if (!isMounted) return;
        const statusMap = {};
        for (const item of payload.providers || []) {
          statusMap[item.provider] = item.connected;
        }
        setProviderStatus(statusMap);
      })
      .catch(() => {
        if (!isMounted) return;
        setProviderStatus({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleProvider = (provider) => {
    setProviders((current) => ({ ...current, [provider]: !current[provider] }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Saisis un titre, un artiste ou une playlist.');
      setResults([]);
      return;
    }

    if (!selectedProviders.length) {
      setError('Active au moins une plateforme pour lancer la recherche.');
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const data = await universalSearch(trimmed, selectedProviders);
      setResults(data.tracks || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Recherche indisponible');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onConnect = async (provider) => {
    try {
      setIsConnecting(provider);
      const result = await getProviderConnectLink(provider);
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
      setError(result.message || 'Ce provider n\'est pas encore supporte en OAuth reel.');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Connexion impossible');
    } finally {
      setIsConnecting('');
    }
  };

  const onDisconnect = async (provider) => {
    try {
      await disconnectProvider(provider);
      setProviderStatus((current) => ({ ...current, [provider]: false }));
    } catch {
      setError('Deconnexion impossible');
    }
  };

  return (
    <main className="page">
      <section className="hero-card">
        <div className="hero-top">
          <p className="chip">Mozikako</p>
          <Sparkles size={16} />
        </div>
        <h1>Un agrégateur musical universel et intelligent</h1>
        <p>
          Connecte tes services, lance une recherche unique, puis choisis la meilleure source
          disponible pour écouter.
        </p>
      </section>

      <section className="section-card">
        <div className="section-title">
          <Link2 size={18} />
          <h2>Services connectés</h2>
        </div>
        <div className="provider-grid">
          {providerOrder.map((provider) => (
            <div key={provider} className={`provider-toggle ${providers[provider] ? 'active' : ''}`}>
              <button type="button" className="toggle-provider-btn" onClick={() => toggleProvider(provider)}>
                <span>{providerLabels[provider]}</span>
                <span>{providers[provider] ? 'ON' : 'OFF'}</span>
              </button>
              <div className="provider-actions">
                <small>{providerStatus[provider] ? 'Connected' : 'Disconnected'}</small>
                {providerStatus[provider] ? (
                  <button type="button" onClick={() => onDisconnect(provider)}>
                    Disconnect
                  </button>
                ) : (
                  <button type="button" onClick={() => onConnect(provider)} disabled={isConnecting === provider}>
                    {isConnecting === provider ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card">
        <div className="section-title">
          <Search size={18} />
          <h2>Recherche universelle</h2>
        </div>

        <form className="search-form" onSubmit={onSubmit}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: Daft Punk, Blinding Lights, Chill playlist"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        {error && <p className="state-text error">{error}</p>}
        {!error && isLoading && <p className="state-text">Interrogation des APIs en cours...</p>}
      </section>

      <section className="section-card">
        <div className="section-title">
          <Disc3 size={18} />
          <h2>Résultats</h2>
        </div>

        {!results.length && !isLoading && !error && (
          <p className="state-text">Aucun résultat pour le moment. Lance une recherche pour commencer.</p>
        )}

        <div className="results-list">
          {results.map((item) => (
            <article className="result-item" key={item.id}>
              <div className="result-top">
                <Music2 size={16} />
                <strong>{item.title}</strong>
              </div>
              <p>{item.artist}</p>
              {item.album ? <small>Album: {item.album}</small> : null}
              <SourceBadges sources={item.sources} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;

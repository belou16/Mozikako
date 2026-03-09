# Mozikako

Mozikako est un agregateur musical universel qui centralise Spotify, Apple Music, Deezer et YouTube dans une interface unique.

## Stack actuelle

- Frontend: React + Vite + Capacitor
- Backend: Node.js + Express
- Objectif architecture: OAuth multi-provider, recherche universelle, synchronisation playlists

## Structure ajoutee

```txt
server/
  index.js
  routes/
    auth.js
    search.js
    playlists.js
  services/
    universalSearch.js
src/
  App.jsx
  App.css
  index.css
  services/
    musicApi.js
```

## Endpoints disponibles

- `GET /api/v1/health`
- `GET /api/v1/auth/providers/status`
- `GET /api/v1/auth/:provider/connect`
- `GET /api/v1/auth/:provider/callback`
- `POST /api/v1/auth/:provider/refresh`
- `DELETE /api/v1/auth/:provider/disconnect`
- `GET /api/v1/search?q=...&providers=spotify,apple,deezer,youtube`
- `GET /api/v1/playlists`
- `POST /api/v1/playlists/import`
- `POST /api/v1/playlists/export`
- `POST /api/v1/playlists/transfer`
- `GET /api/v1/playlists/jobs/:jobId`

## OAuth reel (Spotify + Deezer)

- `GET /api/v1/auth/spotify/connect?redirect=1` redirige vers Spotify OAuth.
- `GET /api/v1/auth/deezer/connect?redirect=1` redirige vers Deezer OAuth.
- Les callbacks echangent le `code` contre un token et persistent la connexion en local dans `server/data/connections.json`.
- `POST /api/v1/auth/spotify/refresh` renouvelle le token Spotify via `refresh_token`.

Note: Apple Music et YouTube restent en mode non-OAuth dans cette base et retournent un message explicite.

## Demarrage

1. Copier `.env.example` vers `.env`
2. Installer les dependances:

```bash
npm install
```

3. Lancer frontend + API:

```bash
npm run dev
```

4. URL utiles:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api/v1/health`

## Notes importantes

- La recherche universelle fusionne Spotify + Apple + Deezer + YouTube dans un format unifie.
- Spotify passe en mode API reelle des qu'un token OAuth est connecte.
- Les jobs playlists (`import/export/transfer`) sont simules avec progression (`queued -> running -> completed`) via endpoint `jobs/:jobId`.

## Etapes suivantes recommandees

1. Brancher OAuth complet (code exchange + refresh) en base securisee.
2. Ajouter connecteurs Spotify/Apple/YouTube reels cote backend.
3. Implementer moteur de sync playlists asynchrone (jobs).
4. Ajouter Firebase ou MongoDB pour persistance utilisateurs/tokens.
